"use client";

import { useState } from "react";
import { ExternalLink, Clock, ImageOff } from "lucide-react";
import { motion } from "framer-motion";
import type { FeedItem } from "@/types/feed";
import { CATEGORY_META } from "@/lib/sources";
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

export function FeedCard({ item, onOpen, index = 0 }: FeedCardProps) {
  const [imgError, setImgError] = useState(false);
  const meta = CATEGORY_META[item.source.category];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      onClick={() => onOpen(item)}
      className={cn(
        "card-lift group cursor-pointer relative flex flex-col overflow-hidden rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]"
      )}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--brand-muted)]/40">
            <ImageOff className="w-8 h-8" />
            <span className="text-[10px] mt-2 font-latin uppercase tracking-wider">
              no preview
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
          <span className="font-medium truncate max-w-[60%]">
            {item.source.nameFa || item.source.name}
          </span>
          <div className="flex items-center gap-1 font-latin">
            <Clock className="w-3 h-3" />
            <span>{relativeFa(item.pubDate)}</span>
          </div>
        </div>
      </div>

      {/* Hover corner indicator */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
      </div>
    </motion.article>
  );
}
