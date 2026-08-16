"use client";

import { useEffect, useState } from "react";

export function useFeedStats() {
  const [stats, setStats] = useState({
    totalItems: 0,
    sourcesOk: 0,
    sourcesTried: 0,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/feed?category=all&limit=200", {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        setStats({
          totalItems: data?.items?.length || 0,
          sourcesOk: data?.sourcesOk || 0,
          sourcesTried: data?.sourcesTried || 0,
          loaded: true,
        });
      } catch {
        if (!cancelled)
          setStats((s) => ({ ...s, loaded: true }));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
