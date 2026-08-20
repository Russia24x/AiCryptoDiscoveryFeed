"use client";

import { useSyncExternalStore, useCallback } from "react";

/**
 * useTetherPrice — fetches USDT/Toman price directly from the user's browser.
 *
 * Sources tried in parallel (first success wins):
 *  1. Nobitex API (api.nobitex.ir) — USDT-RLS orderbook + market stats
 *  2. Wallex API (api.wallex.ir) — USDTTMN market
 *
 * Why client-side:
 *  - Cloudflare Workers (US/EU edge) are geoblocked by Iranian exchanges
 *  - Iranian users' browsers can reach these APIs directly
 *  - No Worker CPU consumed
 *
 * CORS notes:
 *  - Nobitex API likely returns Access-Control-Allow-Origin: * (based on
 *    open-source projects that fetch from it client-side)
 *  - Wallex API returns ACAO: https://wallex.ir only — may be CORS-blocked
 *  - We try both in parallel; whichever works, we use
 *
 * Caching:
 *  - 30-minute cache in localStorage
 *  - In-memory cache shared across hook instances
 *  - Stale-while-revalidate: show cached immediately, refetch in background
 */

export interface TetherPrice {
  price: number;          // Toman per USDT
  change24h?: number;
  high24h?: number;
  low24h?: number;
  source: "nobitex" | "wallex";
  fetchedAt: string;
  cached?: boolean;
  unavailable?: boolean;
  error?: string;
}

const CACHE_KEY = "acd:tether-price";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 6000;

// === Module-level cache ===
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

// === Fetchers ===

/**
 * Try Nobitex API — orderbook for USDT-RLS.
 * Nobitex API may return Access-Control-Allow-Origin: * which allows
 * browser fetch from any origin.
 *
 * Endpoint: GET https://api.nobitex.ir/v2/orderbook/USDT-RLS
 * Response: { data: { bids: [[price, size], ...], asks: [[price, size], ...],
 *            lastTradePrice: "..." } }
 *
 * Also try POST /market/stats for 24h change/high/low:
 * Body: { src_currency: "usdt", dst_currency: "rls" }
 * Response: { stats: { "usdt-rls": { latest, dayChange, dayHigh, dayLow, ... } } }
 */
async function tryNobitex(): Promise<TetherPrice | null> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    // Fetch orderbook for last trade price
    const res = await fetch("https://api.nobitex.ir/v2/orderbook/USDT-RLS", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      credentials: "omit",
      mode: "cors",
    });
    clearTimeout(id);

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
    const priceToman = Math.round(price / 10);

    // Try to fetch 24h stats (change, high, low) — non-blocking, best-effort
    let change24h: number | undefined;
    let high24h: number | undefined;
    let low24h: number | undefined;

    try {
      const statsRes = await fetch("https://api.nobitex.ir/market/stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          src_currency: "usdt",
          dst_currency: "rls",
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        credentials: "omit",
        mode: "cors",
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const stats = statsData?.stats?.["usdt-rls"];
        if (stats) {
          change24h = stats.dayChange != null ? Number(stats.dayChange) : undefined;
          high24h = stats.dayHigh != null ? Math.round(Number(stats.dayHigh) / 10) : undefined;
          low24h = stats.dayLow != null ? Math.round(Number(stats.dayLow) / 10) : undefined;
        }
      }
    } catch {
      // Stats fetch failed — we still have the price from orderbook
    }

    return {
      price: priceToman,
      change24h,
      high24h,
      low24h,
      source: "nobitex",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Try Wallex API — direct USDTTMN market.
 * Wallex returns ACAO: https://wallex.ir only — may be CORS-blocked.
 *
 * Endpoint: GET https://api.wallex.ir/v1/markets
 * Response: { result: { symbols: { USDTTMN: { stats: { lastPrice,
 *            24h_ch, 24h_highPrice, 24h_lowPrice, ... } } } } }
 */
async function tryWallex(): Promise<TetherPrice | null> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch("https://api.wallex.ir/v1/markets", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      credentials: "omit",
      mode: "cors",
    });
    clearTimeout(id);

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

/**
 * Fetch from both sources in parallel — first success wins.
 * Nobitex is preferred (likely better CORS support).
 */
async function fetchTetherPrice(): Promise<TetherPrice> {
  // Try both in parallel for speed
  const [nobitex, wallex] = await Promise.allSettled([
    tryNobitex(),
    tryWallex(),
  ]);

  // Prefer Nobitex (has 24h stats), fall back to Wallex
  if (nobitex.status === "fulfilled" && nobitex.value) {
    return nobitex.value;
  }
  if (wallex.status === "fulfilled" && wallex.value) {
    return wallex.value;
  }

  // Both failed
  return {
    price: 0,
    source: "nobitex",
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

  const isStale = !data || (Date.now() - lastFetchAt > CACHE_TTL_MS);

  return {
    data,
    refetch,
    isStale,
    isFresh: !isStale,
  };
}
