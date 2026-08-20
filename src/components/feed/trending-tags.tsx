"use client";

import { useMemo } from "react";
import { Hash, TrendingUp } from "lucide-react";
import type { FeedItem } from "@/types/feed";
import { useLanguage } from "@/hooks/use-language";
import { formatNumber } from "@/hooks/use-feed-state";

interface TrendingTagsProps {
  items: FeedItem[];
  onTagClick?: (tag: string) => void;
}

export function TrendingTags({ items, onTagClick }: TrendingTagsProps) {
  const { t, lang } = useLanguage();

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      for (const tag of it.tags || []) {
        const k = tag.trim();
        if (!k || k.length > 28) continue;
        map.set(k, (map.get(k) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
  }, [items]);

  if (!tags.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10 border-t border-[var(--brand-border)]">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-[var(--brand-accent)]" />
        <h3 className="text-sm font-bold">
          <span className="text-[var(--brand-text)]">{t.trending.title} </span>
          <span className="text-[var(--brand-accent)]">{t.trending.titleAccent}</span>
        </h3>
        <span className="text-[10px] font-latin text-[var(--brand-muted)] uppercase tracking-wider me-1">
          · {formatNumber(tags.length, lang)} {t.trending.count}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--brand-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-muted)] hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-text)] transition-colors font-latin"
          >
            <Hash className="w-3 h-3 text-[var(--brand-accent)]/60 group-hover:text-[var(--brand-accent)]" />
            <span className="truncate max-w-[180px]">{tag}</span>
            <span className="text-[10px] text-[var(--brand-muted)]/60 ms-1" suppressHydrationWarning>
              {formatNumber(count, lang)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
