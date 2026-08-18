"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedResponse } from "@/types/feed";
import type { Language } from "@/lib/sources";

/**
 * Feed data hook — backed by TanStack Query.
 *
 * This is a thin wrapper around `useQuery` that:
 *   - Builds the API URL from category/search/sourceFilter/lang
 *   - Persists the latest successful response to localStorage so it can
 *     be used as `initialData` on the next page load (instant render)
 *   - Exposes the same shape as the old hand-rolled hook: `{ data, loading,
 *     error, refetch, stale }` so callers don't need to change.
 *
 * Why keep localStorage on top of TanStack Query?
 *   - TanStack Query's in-memory cache is lost on full page reload.
 *   - localStorage survives reloads, so users get instant content even on
 *     a fresh visit (if they've visited before).
 *   - The `initialData` option tells TanStack Query to start with this data
 *     immediately, then refetch in the background.
 *
 * Stale-while-revalidate behavior comes for free from TanStack Query:
 *   - `staleTime: 60s` — data is considered fresh for 1 min
 *   - After that, the next mount triggers a background refetch but the
 *     stale data is shown immediately
 *   - `gcTime: 5min` — cached data is kept for 5 min after the last
 *     observer unsubscribes
 */

const CACHE_PREFIX = "acd:feed-cache:";

interface CacheEntry {
  data: FeedResponse;
  timestamp: number;
}

function readCache(key: string): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed.data || !parsed.timestamp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: FeedResponse) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function useFeed(
  category: string,
  search: string,
  sourceFilter?: string | null,
  lang?: Language
) {
  const queryClient = useQueryClient();
  const cacheKey = `${category}:${lang || "all"}:${sourceFilter || "all"}`;
  const queryKey = ["feed", category, lang || "all", sourceFilter || "all", search.trim()] as const;

  // Read initial data from localStorage so the first render is instant.
  // This is the key to the "instant page load on repeat visits" UX.
  const initialCacheEntry = readCache(cacheKey);

  const query = useQuery<FeedResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        category,
        limit: "80",
      });
      if (search.trim()) params.set("q", search.trim());
      if (sourceFilter) params.set("source", sourceFilter);
      if (lang) params.set("lang", lang);
      const res = await fetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FeedResponse = await res.json();
      // Persist to localStorage for next visit
      writeCache(cacheKey, json);
      return json;
    },
    initialData: initialCacheEntry?.data,
    initialDataUpdatedAt: initialCacheEntry?.timestamp,
    staleTime: 60 * 1000,       // 1 min — data is fresh
    gcTime: 5 * 60 * 1000,      // 5 min — keep cache after unmount
    retry: 1,
    refetchOnWindowFocus: true,
  });

  // `refetch` — manually trigger a fresh fetch (e.g., user clicked "Refresh"
  // button or pulled to refresh on mobile).
  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  // `stale` — true when the data is older than staleTime (used by the UI to
  // show a "stale" badge if desired).
  const stale = query.isStale;

  // Translate TanStack's `error` (Error | null) to a string for the UI.
  const error = query.error instanceof Error
    ? query.error.message
    : query.error
    ? "خطا در دریافت داده"
    : null;

  return {
    data: query.data ?? null,
    loading: query.isLoading && !query.data, // hide skeleton if we have stale data
    error,
    refetch,
    stale,
    // Expose the queryClient so callers can invalidate the cache after
    // mutations (e.g., after adding a custom channel).
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  };
}
