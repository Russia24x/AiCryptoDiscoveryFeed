"use client";

import { useSyncExternalStore, useCallback } from "react";

/**
 * useTetherPrice — fetches USDT/Toman price directly from the user's browser.
 *
 * Architecture decision: Instead of routing through our Cloudflare Worker
 * (which gets geoblocked by Wallex/Nobitex because Cloudflare Workers run
 * in US/EU regions), we fetch directly from the user's browser. This means:
 *
 *  - If the user is in Iran, they can reach Wallex/Nobitex directly ✓
 *  - If the user is outside Iran, the API may geoblock them — we show
 *    "unavailable" gracefully
 *  - No Cloudflare Worker CPU is consumed for this fetch
 *  - The Worker bundle is smaller (no iran-tether route)
 *
 * Caching strategy:
 *  - 30-minute cache in localStorage (per the user's request)
 *  - In-memory cache shared across hook instances
 *  - Stale-while-revalidate: show cached immediately, refetch in background
 *
 * Sources tried in order:
 *  1. Wallex API (api.wallex.ir) — direct USDTTMN market
 *  2. Nobitex API (api.nobitex.ir) — USDT-RLS orderbook
 *
 * The fetch happens client-side, so the user's IP determines reachability.
 */

export interface TetherPrice {
  price: number;          // Toman per USDT
  change24h?: number;
  high24h?: number;
  low24h?: number;
  source: "wallex" | "nobitex";
  fetchedAt: string;
  cached?: boolean;
  unavailable?: boolean;
  error?: string;
}

const CACHE_KEY = "acd:tether-price";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 5000;

// === Module-level cache (shared across all hook instances) ===
let cachedPrice: TetherPrice | null = null;
let lastFetchAt = 0;
let inFlight: Promise<TetherPrice | null> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// === Read from localStorage on first load ===
function loadFromStorage(): TetherPrice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TetherPrice;
    if (!parsed.price || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(data: TetherPrice) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// === Fetchers (run in the user's browser, not the Worker) ===
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    // Note: 'User-Agent' is a forbidden header in browser fetch — it's
    // automatically set by the browser and cannot be overridden.
    // We omit it here; Wallex/Nobitex accept browser requests fine.
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
      },
      // Don't send credentials — these are public APIs
      credentials: "omit",
      // Use 'no-cors' as fallback if the API doesn't support CORS
      // (we'll get an opaque response, but the data will still be cached)
      mode: "cors",
    });
  } finally {
    clearTimeout(id);
  }
}

async function tryWallex(): Promise<TetherPrice | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.wallex.ir/v1/markets",
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const symbols = data?.result?.symbols || {};
    for (const k of Object.keys(symbols)) {
      if (k.toUpperCase() === "USDTTMN") {
        const m = symbols[k];
        const stats = m?.stats || {};
        const price =
          stats.lastPrice != null ? Number(stats.lastPrice) :
          m?.lastPrice != null ? Number(m.lastPrice) : null;
        if (price == null || !Number.isFinite(price) || price <= 0) return null;
        return {
          price: Math.round(price),
          change24h: stats["24h_ch"] != null ? Number(stats["24h_ch"]) : undefined,
          high24h: stats["24h_highPrice"] != null ? Number(stats["24h_highPrice"]) : undefined,
          low24h: stats["24h_lowPrice"] != null ? Number(stats["24h_lowPrice"]) : undefined,
          source: "wallex",
          fetchedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function tryNobitex(): Promise<TetherPrice | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.nobitex.ir/v2/orderbook/USDT-RLS",
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const ob = data?.data;
    if (!ob) return null;
    const lastTrade = ob.lastTradePrice ? Number(ob.lastTradePrice) : null;
    const topBid = ob.bids?.[0]?.[0] ? Number(ob.bids[0][0]) : null;
    const topAsk = ob.asks?.[0]?.[0] ? Number(ob.asks[0][0]) : null;
    let price = lastTrade;
    if (price == null || !Number.isFinite(price)) {
      if (topBid != null && topAsk != null) price = (topBid + topAsk) / 2;
      else if (topBid != null) price = topBid;
      else if (topAsk != null) price = topAsk;
    }
    if (price == null || !Number.isFinite(price) || price <= 0) return null;
    // Convert RLS → Toman (1 Toman = 10 RLS)
    return {
      price: Math.round(price / 10),
      source: "nobitex",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchTetherPrice(): Promise<TetherPrice> {
  // Try Wallex first (more accurate - direct USDTTMN), then Nobitex
  const wallex = await tryWallex();
  if (wallex) return wallex;
  const nobitex = await tryNobitex();
  if (nobitex) return nobitex;
  // Both failed
  return {
    price: 0,
    source: "wallex",
    fetchedAt: new Date().toISOString(),
    unavailable: true,
    error: "Iranian exchange APIs unreachable from your location",
  };
}

// === Public hook ===
export function useTetherPrice() {
  // Lazy-load from localStorage on first client render
  if (!cachedPrice && typeof window !== "undefined") {
    cachedPrice = loadFromStorage();
    if (cachedPrice) {
      lastFetchAt = new Date(cachedPrice.fetchedAt).getTime();
    }
  }

  const getSnapshot = () => cachedPrice;
  const getServerSnapshot = () => null;
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refetch = useCallback(async (): Promise<TetherPrice | null> => {
    // Dedupe concurrent fetches
    if (inFlight) return inFlight;
    inFlight = fetchTetherPrice().then((result) => {
      cachedPrice = result;
      lastFetchAt = Date.now();
      if (!result.unavailable) {
        saveToStorage(result);
      }
      notify();
      inFlight = null;
      return result;
    }).catch(() => {
      inFlight = null;
      return null;
    });
    return inFlight;
  }, []);

  // Determine if cache is stale
  const isStale = !data || (Date.now() - lastFetchAt > CACHE_TTL_MS);

  return {
    data,
    refetch,
    isStale,
    /** True if the cache is fresh (under 30 min) */
    isFresh: !isStale,
  };
}
