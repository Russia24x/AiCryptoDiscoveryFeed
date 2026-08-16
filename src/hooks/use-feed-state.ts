"use client";

import { useEffect, useState, useCallback } from "react";
import type { Language } from "@/lib/sources";

export function useFeedState() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // Hydrate from URL params on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get("category");
    const q = params.get("q");
    const src = params.get("source");

    // Defer setState to avoid cascading renders
    const id = window.setTimeout(() => {
      if (c) setCategory(c);
      if (q) setSearch(q);
      if (src) setSourceFilter(src);

      if (window.location.hash === "#feed") {
        document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  // Sync back to URL (debounced via history.replaceState)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("q", search.trim());
    if (sourceFilter) params.set("source", sourceFilter);
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState({}, "", url);
  }, [category, search, sourceFilter]);

  const onCategoryChange = useCallback((c: string) => {
    setCategory(c);
    // Reset source filter when switching category — the source may not exist in new category
    setSourceFilter(null);
    // smooth scroll to feed
    requestAnimationFrame(() => {
      document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  return {
    category,
    setCategory,
    onCategoryChange,
    search,
    setSearch,
    sourceFilter,
    setSourceFilter,
  };
}

/** Format a number using the active language's digits. */
export function formatNumber(n: number, lang: Language): string {
  return n.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
}

/** Format an ISO date string as a relative time, localized per language. */
export function relativeTime(
  iso: string,
  lang: Language,
  dict: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    monthsAgo: string;
    yearsAgo: string;
  }
): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return dict.justNow;
  if (min < 60) {
    const n = min.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
    return lang === "fa" ? `${n} ${dict.minutesAgo}` : `${n} ${dict.minutesAgo}`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    const n = hr.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
    return `${n} ${dict.hoursAgo}`;
  }
  const day = Math.floor(hr / 24);
  if (day < 30) {
    const n = day.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
    return `${n} ${dict.daysAgo}`;
  }
  const month = Math.floor(day / 30);
  if (month < 12) {
    const n = month.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
    return `${n} ${dict.monthsAgo}`;
  }
  const year = Math.floor(month / 12);
  const n = year.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
  return `${n} ${dict.yearsAgo}`;
}
