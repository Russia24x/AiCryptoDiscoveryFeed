"use client";

import { useEffect, useState, useCallback } from "react";

export function useFeedState() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Hydrate from URL params on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get("category");
    const q = params.get("q");

    // Defer setState to avoid cascading renders
    const id = window.setTimeout(() => {
      if (c) setCategory(c);
      if (q) setSearch(q);

      if (window.location.hash === "#feed") {
        document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [setCategory, setSearch]);

  // Sync back to URL (debounced via history.replaceState)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("q", search.trim());
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState({}, "", url);
  }, [category, search]);

  const onCategoryChange = useCallback((c: string) => {
    setCategory(c);
    // smooth scroll to feed
    requestAnimationFrame(() => {
      document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  return { category, setCategory, onCategoryChange, search, setSearch };
}
