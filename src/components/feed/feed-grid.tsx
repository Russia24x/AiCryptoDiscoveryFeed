"use client";

import { useMemo, useState } from "react";
import { RefreshCw, LayoutGrid, List, Filter } from "lucide-react";
import type { FeedItem } from "@/types/feed";
import { useFeed } from "@/hooks/use-feed";
import { useLanguage } from "@/hooks/use-language";
import { FeedCard } from "./feed-card";
import { ArticleReader } from "./article-reader";
import { FeedSkeleton, FeedEmpty, FeedError } from "./feed-states";
import { SourceFilter } from "./source-filter";
import { SmartImage } from "./smart-image";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { formatNumber } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";

interface FeedGridProps {
  category: string;
  search: string;
  sourceFilter: string | null;
  onSourceChange: (sourceId: string | null) => void;
}

type ViewMode = "grid" | "list";

export function FeedGrid({
  category,
  search,
  sourceFilter,
  onSourceChange,
}: FeedGridProps) {
  const { t, lang } = useLanguage();
  const { data, loading, error, refetch } = useFeed(
    category,
    search,
    sourceFilter,
    lang
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");

  const onOpen = (item: FeedItem) => {
    const idx = data?.items.findIndex((it) => it.id === item.id) ?? -1;
    setSelectedIdx(idx >= 0 ? idx : 0);
    setReaderOpen(true);
  };

  const onPrev = () => {
    if (selectedIdx === null || !data) return;
    setSelectedIdx((idx) => (idx !== null && idx > 0 ? idx - 1 : idx));
  };
  const onNext = () => {
    if (selectedIdx === null || !data) return;
    setSelectedIdx((idx) =>
      idx !== null && idx < data.items.length - 1 ? idx + 1 : idx
    );
  };

  const title = useMemo(() => {
    if (search.trim()) return `${t.feed.searchResults}: «${search}»`;
    if (category === "all") return t.feed.latestContent;
    return categoryLabel(category as any, lang);
  }, [category, search, lang, t]);

  const count = data?.items?.length || 0;
  const selectedItem =
    selectedIdx !== null && data ? data.items[selectedIdx] : null;

  return (
    <section id="feed" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 scroll-mt-20">
      {/* Section header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>{t.feed.feedLive}</span>
            {data?.fetchedAt && (
              <span className="text-[var(--brand-muted)]/60">
                · {t.feed.updated} {new Date(data.fetchedAt).toLocaleTimeString("en-GB")}
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
            <span className="text-[var(--brand-text)]">{title}</span>
            <span className="text-sm font-latin text-[var(--brand-accent)] bg-[var(--brand-accent-soft)] px-2 py-0.5 rounded-md">
              {formatNumber(count, lang)}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {/* View toggle */}
          <div className="hidden sm:flex items-center bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-md p-0.5 mr-1">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-1.5 rounded transition-colors",
                view === "grid"
                  ? "bg-[var(--brand-surface-2)] text-[var(--brand-accent)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              )}
              aria-label={t.feed.gridView}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded transition-colors",
                view === "list"
                  ? "bg-[var(--brand-surface-2)] text-[var(--brand-accent)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              )}
              aria-label={t.feed.listView}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--brand-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">{t.feed.refresh}</span>
          </button>
        </div>
      </div>

      {/* Source filter chips */}
      <SourceFilter
        category={category}
        activeSourceId={sourceFilter}
        onSourceChange={onSourceChange}
      />

      {/* Body */}
      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <FeedError onRetry={refetch} title={t.feed.errorTitle} hint={t.feed.errorHint} retryLabel={t.feed.retry} />
      ) : count === 0 ? (
        <FeedEmpty query={search} title={t.feed.noResults} hint={t.feed.noResultsHint} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data!.items.map((item, i) => (
            <FeedCard key={item.id} item={item} onOpen={onOpen} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data!.items.map((item, i) => (
            <FeedListItem
              key={item.id}
              item={item}
              onOpen={onOpen}
              index={i}
            />
          ))}
        </div>
      )}

      {/* In-app Article Reader (replaces old FeedDetail) */}
      <ArticleReader
        item={selectedItem}
        open={readerOpen}
        onOpenChange={setReaderOpen}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={selectedIdx !== null && selectedIdx > 0}
        hasNext={
          selectedIdx !== null && !!data && selectedIdx < data.items.length - 1
        }
      />
    </section>
  );
}

/** Compact horizontal list-row variant using SmartImage. */
function FeedListItem({
  item,
  onOpen,
  index,
}: {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  index: number;
}) {
  const { t, lang } = useLanguage();
  const meta = CATEGORY_META[item.source.category];

  return (
    <article
      onClick={() => onOpen(item)}
      className="card-lift group cursor-pointer grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] overflow-hidden"
      style={{
        animation: `fadeUp 0.35s ease ${Math.min(index * 0.02, 0.4)}s both`,
      }}
    >
      <SmartImage
        src={item.image}
        alt={item.title}
        category={item.source.category}
        articleUrl={item.link}
        sourceId={item.source.id}
        sourceName={item.source.name}
        variant="card"
        aspectClass="aspect-square md:aspect-auto h-full"
        loading="lazy"
      />
      <div className="p-3 md:p-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-bold" style={{ color: meta?.tint }}>
            {categoryLabel(item.source.category, lang)}
          </span>
          <span className="text-[var(--brand-muted)]">·</span>
          <span className="text-[var(--brand-muted)] truncate">
            {lang === "fa"
              ? item.source.nameFa || item.source.name
              : item.source.name}
          </span>
        </div>
        <h3 className="text-sm md:text-base font-bold line-clamp-2 group-hover:text-[var(--brand-accent)] transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-[var(--brand-muted)] line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>
    </article>
  );
}
