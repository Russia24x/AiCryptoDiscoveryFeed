"use client";

import { useState } from "react";
import {
  ExternalLink,
  Clock,
  ImageOff,
  Bookmark,
  BookmarkCheck,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import type { FeedItem } from "@/types/feed";
import { CATEGORY_META } from "@/lib/sources";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  index?: number;
}

/** Convert ISO date to a Persian relative time string. */
function relativeFa(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "همین حالا";
  if (min < 60) return `${min.toLocaleString("fa-IR")} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr.toLocaleString("fa-IR")} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day.toLocaleString("fa-IR")} روز پیش`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month.toLocaleString("fa-IR")} ماه پیش`;
  const year = Math.floor(month / 12);
  return `${year.toLocaleString("fa-IR")} سال پیش`;
}

/** Estimate reading time in minutes based on description length. */
function readingTime(description?: string): number {
  if (!description) return 1;
  // Count Latin words + Persian words. Latin split by spaces; Persian by char fallback.
  const words = description.trim().split(/\s+/).length;
  // Assume ~220 wpm for mixed-language scanning.
  return Math.max(1, Math.round(words / 220));
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  crypto:
    "linear-gradient(135deg, rgba(247,147,26,0.10) 0%, transparent 60%)",
  ai: "linear-gradient(135deg, rgba(45,212,191,0.10) 0%, transparent 60%)",
  tech: "linear-gradient(135deg, rgba(56,189,248,0.10) 0%, transparent 60%)",
  gaming:
    "linear-gradient(135deg, rgba(167,139,250,0.10) 0%, transparent 60%)",
  future:
    "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, transparent 60%)",
};

export function FeedCard({ item, onOpen, index = 0 }: FeedCardProps) {
  const [imgError, setImgError] = useState(false);
  const meta = CATEGORY_META[item.source.category];
  const { isBookmarked, toggleBookmark, hydrated } = useBookmarks();
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
          // Better empty placeholder — show category icon initial
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className="text-3xl font-bold font-latin opacity-20"
              style={{ color: meta?.tint || "var(--brand-accent)" }}
            >
              {meta?.labelEn?.charAt(0) || "?"}
            </div>
            <span
              className="text-[10px] font-latin uppercase tracking-[0.2em] opacity-40"
              style={{ color: meta?.tint || "var(--brand-muted)" }}
            >
              {meta?.labelEn || "no preview"}
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
            {meta?.label || item.source.category}
          </span>
        </div>

        {/* Bookmark button — always visible on mobile, hover on desktop */}
        <button
          onClick={onBookmarkClick}
          aria-label={bookmarked ? "حذف از نشانک‌ها" : "افزودن به نشانک‌ها"}
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
            {item.source.nameFa || item.source.name}
          </span>
          <div className="flex items-center gap-3 font-latin">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {readingTime(item.description).toLocaleString("fa-IR")} دقیقه
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeFa(item.pubDate)}
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
