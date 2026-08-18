"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Clock, Trash2, TrendingUp } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import {
  useSearchHistory,
  formatHistoryTime,
} from "@/hooks/use-search-history";
import { cn } from "@/lib/utils";

interface SearchHistoryDropdownProps {
  query: string;
  onPick: (q: string) => void;
  onClear: () => void;
  /** Whether the dropdown is currently open (controlled). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dropdown that shows recent search queries when the user focuses the search
 * input. Designed to be positioned absolutely below the search field.
 *
 * Behavior:
 *  - Shows up to 12 recent queries with their last-search timestamp.
 *  - Each entry has a small "remove" button to delete from history.
 *  - "Clear all" button at the bottom.
 *  - Closes on outside click or Escape key.
 */
export function SearchHistoryDropdown({
  query,
  onPick,
  onClear,
  open,
  onOpenChange,
}: SearchHistoryDropdownProps) {
  const { entries, removeEntry, clearAll, hydrated } = useSearchHistory();
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onOpenChange]);

  if (!open || !hydrated || entries.length === 0) return null;

  // Filter entries that match the current query as a prefix
  const filtered = query.trim()
    ? entries.filter((e) =>
        e.query.toLowerCase().includes(query.trim().toLowerCase())
      )
    : entries;

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute top-full mt-2 z-50 w-full min-w-[240px] max-w-[420px]",
        lang === "fa" ? "right-0" : "left-0",
        "rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-xl backdrop-blur-md overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--brand-border)]">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[var(--brand-muted)] font-latin">
          <Clock className="w-3 h-3" />
          {lang === "fa" ? "جستجوهای اخیر" : "Recent searches"}
        </div>
        <button
          onClick={() => {
            clearAll();
            onOpenChange(false);
          }}
          className="text-[10px] text-[var(--brand-muted)] hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-2.5 h-2.5" />
          {lang === "fa" ? "پاک کردن همه" : "Clear all"}
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto [scrollbar-width:thin]">
        {filtered.map((entry, i) => (
          <button
            key={`${entry.query}-${entry.timestamp}`}
            onClick={() => {
              onPick(entry.query);
              onOpenChange(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--brand-surface-2)] transition-colors group text-right"
          >
            <TrendingUp className="w-3 h-3 text-[var(--brand-muted)] shrink-0 group-hover:text-[var(--brand-accent)] transition-colors" />
            <span className="flex-1 truncate text-[var(--brand-text)] group-hover:text-[var(--brand-accent)]">
              {entry.query}
            </span>
            <span className="text-[9px] font-latin text-[var(--brand-muted)] shrink-0">
              {formatHistoryTime(entry.timestamp, lang)}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                removeEntry(entry.query);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  removeEntry(entry.query);
                }
              }}
              className="p-1 rounded hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              aria-label={lang === "fa" ? "حذف" : "Remove"}
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
