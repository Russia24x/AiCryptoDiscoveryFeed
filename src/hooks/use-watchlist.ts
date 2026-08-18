"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useWatchlist — localStorage-backed list of pinned coin IDs.
 *
 * Users can pin coins in the Market Intelligence table. Pinned coins
 * appear at the top of the table and can be filtered with a "Watchlist"
 * toggle.
 *
 * Stored in localStorage under key "acd:watchlist" as a JSON array of
 * CoinGecko coin IDs (e.g., ["bitcoin", "ethereum", "solana"]).
 *
 * Cross-tab sync via `storage` event + same-tab via custom event.
 * Max 50 coins.
 */

const STORAGE_KEY = "acd:watchlist";
const MAX_ITEMS = 50;

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("acd:watchlist-changed"));
  } catch {
    // ignore
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setWatchlist(readStorage());
      setHydrated(true);
    }, 0);

    const onChange = () => setWatchlist(readStorage());
    window.addEventListener("storage", onChange);
    window.addEventListener("acd:watchlist-changed", onChange as EventListener);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("acd:watchlist-changed", onChange as EventListener);
    };
  }, []);

  const isWatched = useCallback(
    (coinId: string) => watchlist.includes(coinId),
    [watchlist]
  );

  const toggle = useCallback((coinId: string) => {
    const current = readStorage();
    const idx = current.indexOf(coinId);
    let next: string[];
    if (idx >= 0) {
      next = current.filter((id) => id !== coinId);
    } else {
      next = [coinId, ...current].slice(0, MAX_ITEMS);
    }
    writeStorage(next);
    setWatchlist(next);
  }, []);

  const clearAll = useCallback(() => {
    writeStorage([]);
    setWatchlist([]);
  }, []);

  return {
    watchlist,
    count: watchlist.length,
    hydrated,
    isWatched,
    toggle,
    clearAll,
  };
}
