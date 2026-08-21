"use client";

import { useState, memo } from "react";
import {
  ExternalLink,
  Clock,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Clock3,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import type { FeedItem } from "@/types/feed";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useReadLater } from "@/hooks/use-read-later";
import { useLanguage } from "@/hooks/use-language";
import { relativeTime, formatNumber } from "@/hooks/use-feed-state";
import { SmartImage } from "./smart-image";
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

export const FeedCard = memo(function FeedCard({ item, onOpen, index = 0 }: FeedCardProps) {
  const meta = CATEGORY_META[item.source.category];
  const { isBookmarked, toggleBookmark, hydrated } = useBookmarks();
  const { isInQueue, addToQueue, removeFromQueue, hydrated: queueHydrated } = useReadLater();
  const { t, lang } = useLanguage();
  const bookmarked = hydrated && isBookmarked(item.id);
  const queued = queueHydrated && isInQueue(item.id);

  const onBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasBookmarked = bookmarked;
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
    // Toast feedback
    import("sonner").then(({ toast }) => {
      if (wasBookmarked) {
        toast(
          lang === "fa"
            ? "از نشانک‌ها حذف شد"
            : "Removed from bookmarks",
          { duration: 1800 }
        );
      } else {
        toast.success(
          lang === "fa"
            ? "به نشانک‌ها اضافه شد"
            : "Added to bookmarks",
          {
            duration: 1800,
            description: item.title,
          }
        );
      }
    });
  };

  const onReadLaterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasQueued = queued;
    if (wasQueued) {
      removeFromQueue(item.id);
      import("sonner").then(({ toast }) => {
        toast(
          lang === "fa"
            ? "از صف خواندن حذف شد"
            : "Removed from read-later",
          { duration: 1800 }
        );
      });
    } else {
      const added = addToQueue({
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
      if (added) {
        import("sonner").then(({ toast }) => {
          toast.success(
            lang === "fa"
              ? "به صف خواندن اضافه شد"
              : "Added to read-later",
            {
              duration: 2200,
              description:
                lang === "fa"
                  ? "به‌طور خودکار پس از ۷ روز حذف می‌شود"
                  : "Auto-expires after 7 days",
            }
          );
        });
      }
    }
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
      <div className="relative">
        <SmartImage
          src={item.image}
          alt={item.title}
          category={item.source.category}
          articleUrl={item.link}
          sourceId={item.source.id}
          sourceName={sourceDisplayName}
          variant="card"
          aspectClass="aspect-[16/9]"
          loading="lazy"
        />

        {/* Category tint at top-left */}
        <div className="absolute top-2.5 left-2.5 pointer-events-none">
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

        {/* Action buttons cluster (top-right): bookmark + read-later */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {/* Read Later button */}
          <button
            onClick={onReadLaterClick}
            aria-label={
              queued
                ? lang === "fa"
                  ? "حذف از صف خواندن"
                  : "Remove from read-later"
                : lang === "fa"
                ? "افزودن به صف خواندن"
                : "Add to read-later"
            }
            className={cn(
              "p-1.5 rounded-md backdrop-blur-md transition-all",
              "bg-[rgba(13,15,18,0.7)] hover:bg-[rgba(13,15,18,0.9)]",
              queued
                ? "text-amber-400"
                : "text-white/80 opacity-0 group-hover:opacity-100"
            )}
          >
            {queued ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Clock3 className="w-3.5 h-3.5" />
            )}
          </button>
          {/* Bookmark button */}
          <button
            onClick={onBookmarkClick}
            aria-label={bookmarked ? t.detail.unbookmark : t.detail.bookmark}
            className={cn(
              "p-1.5 rounded-md backdrop-blur-md transition-all",
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

        {/* Read-time badge — bottom-right of image */}
        <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-md bg-[rgba(13,15,18,0.75)] text-[var(--brand-muted)]">
            <BookOpen className="w-2.5 h-2.5" />
            <span className="font-latin">
              {formatNumber(readingTime(item.description), lang)}
            </span>
            <span>{t.feed.minutesShort}</span>
          </span>
        </div>
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
          <span className="font-medium truncate max-w-[55%] flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: meta?.tint }}
            />
            {sourceDisplayName}
          </span>
          <div className="flex items-center gap-1 font-latin">
            <Clock className="w-3 h-3" />
            <span>{relativeTime(item.pubDate, lang, t.feed)}</span>
          </div>
        </div>
      </div>

      {/* Hover corner indicator */}
      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <ExternalLink className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
      </div>
    </motion.article>
  );
});
