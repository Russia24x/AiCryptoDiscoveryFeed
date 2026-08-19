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
 *   - refetchOnWindowFocus: false — disabled by default to avoid hammering
 *     rate-limited APIs (CoinGecko free tier is 30 calls/min). Individual
 *     queries that need live data (like ticker prices) can opt in with
 *     `refetchOnWindowFocus: true`.
 *   - refetchOnReconnect: true — when network comes back after offline.
 *
 * Per-query staleTime overrides (in components):
 *   - Ticker prices: 30s (live-ish)
 *   - Market data: 60s (medium)
 *   - Fear/Greed, Altcoin Season: 5min (slow)
 *   - Static metadata: 30min (very slow)
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
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
