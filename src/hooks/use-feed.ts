"use client";

import { useEffect, useState, useCallback } from "react";
import type { FeedResponse } from "@/types/feed";

export function useFeed(
  category: string,
  search: string,
  sourceFilter?: string | null
) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        category,
        limit: "80",
      });
      if (search.trim()) params.set("q", search.trim());
      if (sourceFilter) params.set("source", sourceFilter);
      const res = await fetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FeedResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت داده");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [category, search, sourceFilter]);

  useEffect(() => {
    const t = setTimeout(() => refetch(), 150);
    return () => clearTimeout(t);
  }, [refetch]);

  return { data, loading, error, refetch };
}
