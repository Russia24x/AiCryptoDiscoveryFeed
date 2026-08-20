"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";

/**
 * useTetherPrice — fetches USDT/Toman price from our /api/tether route.
 *
 * Architecture:
 *  - Our Cloudflare Worker scrapes nobitex.ir/price/usdt/ HTML
 *  - nobitex.ir is NOT geoblocked from Workers (unlike api.nobitex.ir)
 *  - The Worker extracts the real free-market price from the HTML
 *  - Returns data with Access-Control-Allow-Origin: *
 *  - 5-minute in-memory cache + 5-minute edge cache
 *
 * This approach works because:
 *  - nobitex.ir (website) is behind ArvanCloud, NOT Cloudflare
 *  - Cloudflare Workers CAN reach nobitex.ir (200 OK)
 *  - The price page has SSR data with the current price in HTML
 *  - No CORS issues (our Worker adds ACAO: *)
 */

export interface TetherPrice {
  price: number;          // Toman per USDT
  source: "nobitex";
  fetchedAt: string;
  cached?: boolean;
  stale?: boolean;
  unavailable?: boolean;
  error?: string;
}

const CACHE_KEY = "acd:tether-price";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (localStorage)
const FETCH_TIMEOUT_MS = 10000;

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

async function fetchTetherPrice(): Promise<TetherPrice> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch("/api/tether", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(id);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.unavailable) {
      return {
        price: 0,
        source: "nobitex",
        fetchedAt: new Date().toISOString(),
        unavailable: true,
        error: data.error || "Unavailable",
      };
    }

    return {
      price: data.price,
      source: "nobitex",
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      cached: data.cached,
      stale: data.stale,
    };
  } catch (e) {
    return {
      price: 0,
      source: "nobitex",
      fetchedAt: new Date().toISOString(),
      unavailable: true,
      error: e instanceof Error ? e.message : "Fetch failed",
    };
  }
}

// === Public hook ===
export function useTetherPrice() {
  // Lazy-load from localStorage on mount (NOT during render — that's a
  // side effect and React 19's eslint flags it). We do this in a
  // useEffect that runs once on the client. The notify() call triggers
  // a re-render via useSyncExternalStore so consumers see the loaded
  // value immediately.
  useEffect(() => {
    if (cachedPrice) return; // already loaded
    const stored = loadFromStorage();
    if (stored) {
      cachedPrice = stored;
      lastFetchAt = new Date(stored.fetchedAt).getTime();
      notify();
    }
  }, []);

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
