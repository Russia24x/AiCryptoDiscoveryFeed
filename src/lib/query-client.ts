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
 *   - staleTime: 30s — short enough that data feels live (BTC, weather,
 *     SP500 update frequently) but long enough to avoid hammering APIs
 *     when navigating between pages.
 *   - gcTime: 5min — cached data is kept for 5 min after the last observer
 *     unsubscribes, so back-navigation feels instant.
 *   - retry: 1 — for transient failures (e.g., Cloudflare PoP switch),
 *     one retry is enough. Multiple retries slow down the UI.
 *   - refetchOnWindowFocus: true — when the user comes back to the tab,
 *     refresh all visible queries. Critical for live data (prices, weather).
 *   - refetchOnReconnect: true — when network comes back after offline.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
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
