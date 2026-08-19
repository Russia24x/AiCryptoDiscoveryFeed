"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Read-Later queue — a TRANSIENT list of articles the user wants to read later.
 *
 * Distinct from bookmarks (which are persistent favorites). Read-later items
 * auto-expire after 7 days to keep the queue focused.
 *
 * Stored in localStorage under key "acd:read-later" as JSON array of entries.
 * Cross-tab sync via `storage` event + same-tab sync via custom
 * `acd:read-later-changed` event.
 *
 * Maximum 100 entries (oldest non-expired dropped first if exceeded).
 */

const STORAGE_KEY = "acd:read-later";
// NOTE: Renamed from MAX_ENTRIES to avoid an esbuild minifier bug on
// Cloudflare Pages. See use-search-history.ts for the full explanation.
const QUEUE_LIMIT = 100;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ReadLaterEntry {
  id: string;
  title: string;
  link: string;
  description?: string;
  image?: string;
  pubDate: string;
  sourceName?: string;
  sourceNameFa?: string;
  category?: string;
  /** ISO date string when the entry was added (used for TTL expiry). */
  addedAt: string;
}

/** Drop entries that are older than TTL_MS. */
function pruneExpired(entries: ReadLaterEntry[]): ReadLaterEntry[] {
  const cutoff = Date.now() - TTL_MS;
  return entries.filter((e) => {
    const ts = Date.parse(e.addedAt);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

function readStorage(): ReadLaterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((e) => e && e.id && e.title);
    // Prune expired on read so the UI never shows stale entries
    return pruneExpired(valid);
  } catch {
    return [];
  }
}

function writeStorage(entries: ReadLaterEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("acd:read-later-changed"));
  } catch {
    // storage full or unavailable — ignore
  }
}

/** Get remaining milliseconds before this entry expires. Returns 0 if expired. */
export function timeUntilExpiry(entry: ReadLaterEntry): number {
  const ts = Date.parse(entry.addedAt);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, ts + TTL_MS - Date.now());
}

/** Format remaining time as a human-friendly string. */
export function formatExpiry(entry: ReadLaterEntry, lang: "fa" | "en"): string {
  const ms = timeUntilExpiry(entry);
  if (ms <= 0) return lang === "fa" ? "منقضی" : "Expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const fa = (n: number) =>
    n.toString().replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  if (days >= 1) {
    return lang === "fa"
      ? `${fa(days)} روز ${fa(hours)} ساعت`
      : `${days}d ${hours}h left`;
  }
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return lang === "fa"
    ? `${fa(hours)} ساعت ${fa(mins)} دقیقه`
    : `${hours}h ${mins}m left`;
}

export function useReadLater() {
  const [entries, setEntries] = useState<ReadLaterEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders on first mount
    const id = window.setTimeout(() => {
      const stored = readStorage();
      setEntries(stored);
      // If we pruned any expired entries on read, persist the cleaned list.
      if (stored.length !== readStorage().length) {
        writeStorage(stored);
      }
      setHydrated(true);
    }, 0);

    const onChange = () => setEntries(readStorage());
    window.addEventListener("storage", onChange);
    window.addEventListener("acd:read-later-changed", onChange as EventListener);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("acd:read-later-changed", onChange as EventListener);
    };
  }, []);

  const isInQueue = useCallback(
    (id: string) => entries.some((e) => e.id === id),
    [entries]
  );

  const addToQueue = useCallback(
    (entry: Omit<ReadLaterEntry, "addedAt">) => {
      const current = readStorage();
      // Skip if already in queue
      if (current.some((e) => e.id === entry.id)) return false;
      const next = [
        { ...entry, addedAt: new Date().toISOString() },
        ...current,
      ].slice(0, QUEUE_LIMIT);
      writeStorage(next);
      setEntries(next);
      return true;
    },
    []
  );

  const removeFromQueue = useCallback((id: string) => {
    const next = readStorage().filter((e) => e.id !== id);
    writeStorage(next);
    setEntries(next);
  }, []);

  const clearAll = useCallback(() => {
    writeStorage([]);
    setEntries([]);
  }, []);

  /** Force-prune expired entries now (called periodically by the UI). */
  const pruneNow = useCallback(() => {
    const next = pruneExpired(readStorage());
    if (next.length !== entries.length) {
      writeStorage(next);
      setEntries(next);
    }
  }, [entries.length]);

  return {
    entries,
    count: entries.length,
    hydrated,
    isInQueue,
    addToQueue,
    removeFromQueue,
    clearAll,
    pruneNow,
  };
}
