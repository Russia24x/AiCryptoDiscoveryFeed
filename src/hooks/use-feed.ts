"use client";

import { useEffect, useState, useCallback } from "react";
import type { FeedResponse } from "@/types/feed";
import type { Language } from "@/lib/sources";

// Cache TTL on client — 5 minutes (matches server cache)
const CLIENT_CACHE_TTL = 5 * 60 * 1000;

// localStorage key prefix for feed cache
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

/**
 * Stale-while-revalidate hook for fetching feed data.
 *
 * Strategy:
 * 1. On mount: instantly render cached data if available (even if stale).
 * 2. Then fetch fresh data in the background.
 * 3. When fresh data arrives, replace the stale data.
 *
 * This gives users instant page loads on repeat visits while still
 * keeping content fresh.
 */
export function useFeed(
  category: string,
  search: string,
  sourceFilter?: string | null,
  lang?: Language
) {
  const cacheKey = `${category}:${lang || "all"}:${sourceFilter || "all"}`;

  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const refetch = useCallback(async () => {
    setError(null);

    // Check client cache first — instant render if available
    const cached = readCache(cacheKey);
    if (cached) {
      setData(cached.data);
      setLoading(false);
      // If cache is fresh enough, don't bother revalidating
      const age = Date.now() - cached.timestamp;
      if (age < CLIENT_CACHE_TTL) {
        setStale(false);
        return;
      }
      // Cache is stale — show cached data, but revalidate in background
      setStale(true);
    } else {
      setLoading(true);
    }

    try {
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
      setData(json);
      setError(null);
      setStale(false);
      // Persist to client cache
      writeCache(cacheKey, json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت داده");
      // Don't clear cached data on error — keep showing stale
    } finally {
      setLoading(false);
    }
  }, [category, search, sourceFilter, lang, cacheKey]);

  useEffect(() => {
    const t = setTimeout(() => refetch(), 50);
    return () => clearTimeout(t);
  }, [refetch]);

  return { data, loading, error, refetch, stale };
}
