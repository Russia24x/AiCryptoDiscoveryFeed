"use client";

import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * TanStack Query client — singleton instance shared across the app.
 *
 * Why singleton:
 *   - On the server (SSR/edge): one client per request (in-memory only,
 *     no persistence across requests — would be a memory leak).
 *   - On the client: one client for the lifetime of the page, shared by
 *     all `useQuery` calls. This enables cross-component deduplication
 *     and a unified cache.
 *
 * Default options rationale:
 *   - staleTime: 60s — most data in this app doesn't change more often than
 *     once per minute, so 60s is a safe default. Individual queries override
 *     with longer/shorter times as needed.
 *   - gcTime: 10min — cached data is kept for 10 min after the last observer
 *     unsubscribes, so back-navigation feels instant.
 *   - retry: 1 — for transient failures, one retry is enough.
 *   - retryDelay: exponential backoff (default TanStack behavior).
 *   - refetchOnWindowFocus: 'always' — REFRESHES stale queries when the user
 *     returns to the tab. This is the main lever for "fresh content" without
 *     polling. Combined with staleTime, this means:
 *       - If data is fresh (< staleTime): no refetch on focus.
 *       - If data is stale (> staleTime): refetch on focus (silent, in
 *         background, no loading spinner — TanStack shows stale data
 *         while refetching).
 *     This is MUCH cheaper than refetchInterval (which polls every N
 *     seconds even when the user is not looking) and gives users fresh
 *     content the moment they switch back to the tab.
 *   - refetchOnReconnect: true — when network comes back after offline.
 *
 * Per-query staleTime overrides (in components):
 *   - Ticker prices: 30s (live-ish)
 *   - Market data: 60s (medium)
 *   - Fear/Greed, Altcoin Season: 5min (slow)
 *   - Static metadata: 30min (very slow)
 *
 * Refetch frequency calculation (worst case for CoinGecko free tier
 * 30 calls/min):
 *   - User opens /crypto/market: 6 queries (markets, cmc-listings,
 *     global-stats, trending, fear-greed-historical, top-gainers) = 6 calls
 *   - User switches to another tab and comes back after 2min:
 *     queries with staleTime <= 2min refetch (markets, global-stats) = 2 calls
 *   - User stays on page for 10min without switching tabs: 0 refetches
 *     (no polling, only focus-based refetch)
 *   - User navigates to /crypto/market/bitcoin: 2 new queries, both cached
 *     (shared key for geckoMarkets) = 1-2 calls
 *
 * Total per minute of active browsing: ~6-10 calls (well within 30/min).
 * The previous setup with refetchInterval on every widget could hit
 * 30 calls/min within 3-4 minutes of staying on a page.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30_000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important so we don't make a new client on every render
  // (which would happen during React Strict Mode double-render in dev).
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
