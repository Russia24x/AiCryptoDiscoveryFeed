"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "acd:bookmarks";
const MAX_BOOKMARKS = 200;

export interface BookmarkEntry {
  id: string;
  title: string;
  link: string;
  description?: string;
  image?: string;
  pubDate: string;
  sourceName?: string;
  sourceNameFa?: string;
  category?: string;
  savedAt: string;
}

function readStorage(): BookmarkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b) => b && b.id && b.title);
  } catch {
    return [];
  }
}

function writeStorage(entries: BookmarkEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // Notify other hook instances in same tab
    window.dispatchEvent(new CustomEvent("acd:bookmarks-changed"));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders on first mount
    const id = window.setTimeout(() => {
      setBookmarks(readStorage());
      setHydrated(true);
    }, 0);

    const onChange = () => setBookmarks(readStorage());
    window.addEventListener("storage", onChange);
    window.addEventListener("acd:bookmarks-changed", onChange as EventListener);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("acd:bookmarks-changed", onChange as EventListener);
    };
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (entry: Omit<BookmarkEntry, "savedAt">) => {
      const current = readStorage();
      const idx = current.findIndex((b) => b.id === entry.id);
      let next: BookmarkEntry[];
      if (idx >= 0) {
        // remove
        next = current.filter((b) => b.id !== entry.id);
      } else {
        // add (with cap)
        next = [
          { ...entry, savedAt: new Date().toISOString() },
          ...current,
        ].slice(0, MAX_BOOKMARKS);
      }
      writeStorage(next);
      setBookmarks(next);
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    const next = readStorage().filter((b) => b.id !== id);
    writeStorage(next);
    setBookmarks(next);
  }, []);

  const clearAll = useCallback(() => {
    writeStorage([]);
    setBookmarks([]);
  }, []);

  return {
    bookmarks,
    count: bookmarks.length,
    hydrated,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearAll,
  };
}
