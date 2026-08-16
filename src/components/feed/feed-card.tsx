"use client";

import { useState } from "react";
import {
  ExternalLink,
  Clock,
  Bookmark,
  BookmarkCheck,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import type { FeedItem } from "@/types/feed";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useLanguage } from "@/hooks/use-language";
import { relativeTime, formatNumber } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  index?: number;
}

/** Estimate reading time in minutes based on description length. */
function readingTime(description?: string): number {
  if (!description) return 1;
  const words = description.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  crypto:
    "linear-gradient(135deg, rgba(247,147,26,0.10) 0%, transparent 60%)",
  ai: "linear-gradient(135deg, rgba(45,212,191,0.10) 0%, transparent 60%)",
  tech: "linear-gradient(135deg, rgba(56,189,248,0.10) 0%, transparent 60%)",
  gaming:
    "linear-gradient(135deg, rgba(167,139,250,0.10) 0%, transparent 60%)",
  entertainment:
    "linear-gradient(135deg, rgba(244,114,182,0.10) 0%, transparent 60%)",
};

export function FeedCard({ item, onOpen, index = 0 }: FeedCardProps) {
  const [imgError, setImgError] = useState(false);
  const meta = CATEGORY_META[item.source.category];
  const { isBookmarked, toggleBookmark, hydrated } = useBookmarks();
  const { t, lang } = useLanguage();
  const bookmarked = hydrated && isBookmarked(item.id);

  const onBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark({
      id: item.id,
      title: item.title,
      link: item.link,
      description: item.description,
      image: item.image,
      pubDate: item.pubDate,
      sourceName: item.source.name,
      sourceNameFa: item.source.nameFa,
      category: item.source.category,
    });
  };

  const sourceDisplayName =
    lang === "fa"
      ? item.source.nameFa || item.source.name
      : item.source.name;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      onClick={() => onOpen(item)}
      className={cn(
        "card-lift group cursor-pointer relative flex flex-col overflow-hidden rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]"
      )}
      style={{
        backgroundImage: CATEGORY_GRADIENTS[item.source.category],
      }}
    >
      {/* Media */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--brand-surface-2)]">
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className="text-3xl font-bold font-latin opacity-20"
              style={{ color: meta?.tint || "var(--brand-accent)" }}
            >
              {(lang === "fa"
                ? meta?.label?.charAt(0)
                : meta?.labelEn?.charAt(0)) || "?"}
            </div>
            <span
              className="text-[10px] font-latin uppercase tracking-[0.2em] opacity-40"
              style={{ color: meta?.tint || "var(--brand-muted)" }}
            >
              {lang === "fa"
                ? categoryLabel(item.source.category, "fa")
                : categoryLabel(item.source.category, "en")}
            </span>
          </div>
        )}

        {/* Category tint at top-left */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md"
            style={{
              backgroundColor: "rgba(13, 15, 18, 0.7)",
              color: meta?.tint || "var(--brand-accent)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: meta?.tint || "var(--brand-accent)" }}
            />
            {categoryLabel(item.source.category, lang)}
          </span>
        </div>

        {/* Bookmark button */}
        <button
          onClick={onBookmarkClick}
          aria-label={bookmarked ? t.detail.unbookmark : t.detail.bookmark}
          className={cn(
            "absolute top-2.5 right-2.5 p-1.5 rounded-md backdrop-blur-md transition-all",
            "bg-[rgba(13,15,18,0.7)] hover:bg-[rgba(13,15,18,0.9)]",
            bookmarked
              ? "text-[var(--brand-accent)]"
              : "text-white/80 opacity-0 group-hover:opacity-100"
          )}
        >
          {bookmarked ? (
            <BookmarkCheck className="w-3.5 h-3.5 fill-[var(--brand-accent)]" />
          ) : (
            <Bookmark className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-[15px] md:text-base font-bold leading-snug line-clamp-3 text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors">
          {item.title}
        </h3>

        {item.description && (
          <p className="mt-2 text-xs md:text-[13px] text-[var(--brand-muted)] leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-[var(--brand-muted)]">
          <span className="font-medium truncate max-w-[45%]">
            {sourceDisplayName}
          </span>
          <div className="flex items-center gap-3 font-latin">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {formatNumber(readingTime(item.description), lang)}{" "}
              {t.feed.minutesShort}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(item.pubDate, lang, t.feed)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover corner indicator */}
      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
      </div>
    </motion.article>
  );
}
