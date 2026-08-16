"use client";

import { useState } from "react";
import { ExternalLink, Clock, X, Tag } from "lucide-react";
import type { FeedItem } from "@/types/feed";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { relativeTime } from "@/hooks/use-feed-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedDetailProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedDetail({ item, open, onOpenChange }: FeedDetailProps) {
  const [imgError, setImgError] = useState(false);
  const { t, lang } = useLanguage();

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[var(--brand-surface)] border-[var(--brand-border)]" />
      </Dialog>
    );
  }

  const meta = CATEGORY_META[item.source.category];

  let host = "";
  try {
    host = new URL(item.link).hostname;
  } catch {
    host = "";
  }

  const sourceDisplayName =
    lang === "fa"
      ? item.source.nameFa || item.source.name
      : item.source.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl"
      >
        {/* Image header */}
        {item.image && !imgError && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--brand-surface-2)]">
            <img
              src={item.image}
              alt={item.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-surface)] via-transparent to-transparent" />
          </div>
        )}

        <DialogHeader className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold"
              style={{
                backgroundColor: "var(--brand-accent-soft)",
                color: meta?.tint || "var(--brand-accent)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: meta?.tint || "var(--brand-accent)" }}
              />
              {categoryLabel(item.source.category, lang)}
            </span>
            <span className="text-[11px] text-[var(--brand-muted)]">•</span>
            <span className="text-[11px] text-[var(--brand-muted)]">
              {sourceDisplayName}
            </span>
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold leading-snug text-right">
            {item.title}
          </DialogTitle>

          <div className="flex items-center justify-between mt-3 text-xs text-[var(--brand-muted)]">
            <div className="flex items-center gap-1.5 font-latin">
              <Clock className="w-3.5 h-3.5" />
              <span>{relativeTime(item.pubDate, lang, t.feed)}</span>
            </div>
            {item.author && (
              <span className="font-latin truncate max-w-[50%]">
                {item.author}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 pb-6 pt-3 overflow-y-auto max-h-[40vh] md:max-h-[50vh]">
          {item.description && (
            <p className="text-sm md:text-base text-[var(--brand-text)] leading-relaxed">
              {item.description}
            </p>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[var(--brand-border)]">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--brand-muted)] mb-2">
                <Tag className="w-3 h-3" />
                <span>{t.detail.tags}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] font-latin"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[var(--brand-border)] flex items-center justify-between bg-[var(--brand-bg)]/40">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-muted)] hover:text-[var(--brand-accent)] transition-colors"
          >
            <span className="font-latin truncate max-w-[200px]">{host}</span>
          </a>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110 transition"
          >
            {t.detail.readFull}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
