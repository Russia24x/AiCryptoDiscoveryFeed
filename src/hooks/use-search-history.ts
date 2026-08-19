"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Search history hook — stores recent search queries to localStorage.
 *
 * Behavior:
 *  - Last 12 unique queries are stored in `acd:search-history`.
 *  - When the user types a query and triggers a search (e.g., presses Enter
 *    or pauses typing for >1.5s), the query is added to the history.
 *  - The history is exposed as a list for the UI to show as quick suggestions.
 *  - Cross-tab sync via storage event + same-tab via custom event.
 *
 * Used by the search input in the header to show recent searches as a
 * dropdown when the input is focused.
 */

const STORAGE_KEY = "acd:search-history";
// NOTE: Do NOT name this `MAX_ENTRIES` — that identifier triggers a bug in
// esbuild's minifier when combined with Turbopack's output for Cloudflare
// Pages (@cloudflare/next-on-pages). The minifier concatenates it with the
// next statement (globalThis._ENTRIES) producing invalid syntax:
//   `MAXglobalThis._ENTRIES:12}}function ...`
// Renaming to `LIMIT` avoids the bug. See:
// https://github.com/cloudflare/next-on-pages/issues/500
const HISTORY_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 1500;

export interface SearchHistoryEntry {
  query: string;
  timestamp: number; // epoch ms
}

function readStorage(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.query === "string");
  } catch {
    return [];
  }
}

function writeStorage(entries: SearchHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("acd:search-history-changed"));
  } catch {
    // ignore
  }
}

export function useSearchHistory() {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEntries(readStorage());
      setHydrated(true);
    }, 0);
    const onChange = () => setEntries(readStorage());
    window.addEventListener("storage", onChange);
    window.addEventListener("acd:search-history-changed", onChange as EventListener);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("acd:search-history-changed", onChange as EventListener);
    };
  }, []);

  const addEntry = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    const current = readStorage();
    // Remove existing entry with same query (case-insensitive) so it goes to top
    const filtered = current.filter(
      (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
    );
    const next = [
      { query: trimmed, timestamp: Date.now() },
      ...filtered,
    ].slice(0, HISTORY_LIMIT);
    writeStorage(next);
    setEntries(next);
  }, []);

  const removeEntry = useCallback((query: string) => {
    const current = readStorage();
    const next = current.filter((e) => e.query.toLowerCase() !== query.toLowerCase());
    writeStorage(next);
    setEntries(next);
  }, []);

  const clearAll = useCallback(() => {
    writeStorage([]);
    setEntries([]);
  }, []);

  /** Returns true if the given query is already in the history. */
  const has = useCallback(
    (query: string) =>
      entries.some((e) => e.query.toLowerCase() === query.toLowerCase()),
    [entries]
  );

  return {
    entries,
    hydrated,
    addEntry,
    removeEntry,
    clearAll,
    has,
    HISTORY_LIMIT,
  };
}

/** Format a history entry's timestamp as a relative time string. */
export function formatHistoryTime(timestamp: number, lang: "fa" | "en"): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const fa = (n: number | string) =>
    String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  if (minutes < 1) return lang === "fa" ? "همین حالا" : "just now";
  if (minutes < 60) {
    return lang === "fa" ? `${fa(minutes)} دقیقه پیش` : `${minutes}m ago`;
  }
  if (hours < 24) {
    return lang === "fa" ? `${fa(hours)} ساعت پیش` : `${hours}h ago`;
  }
  if (days < 7) {
    return lang === "fa" ? `${fa(days)} روز پیش` : `${days}d ago`;
  }
  // Fallback to date
  const d = new Date(timestamp);
  const s = d.toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US");
  return s;
}

/** Debounce trigger for tracking when the user "commits" to a search. */
export function useSearchDebounce(
  query: string,
  onCommit: (q: string) => void,
  delay = DEBOUNCE_MS
) {
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) return;
    const id = setTimeout(() => onCommit(query), delay);
    return () => clearTimeout(id);
  }, [query, onCommit, delay]);
}
