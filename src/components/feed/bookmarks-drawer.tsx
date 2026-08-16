"use client";

import { useState } from "react";
import { Bookmark, X, ExternalLink, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useLanguage } from "@/hooks/use-language";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { relativeTime } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";

interface BookmarksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookmarksDrawer({ open, onOpenChange }: BookmarksDrawerProps) {
  const { bookmarks, removeBookmark, clearAll } = useBookmarks();
  const { t, lang } = useLanguage();
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={lang === "fa" ? "left" : "right"}
        className="w-full sm:w-[420px] bg-[var(--brand-surface)] border-l border-[var(--brand-border)] p-0 overflow-y-auto"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--brand-border)] sticky top-0 bg-[var(--brand-surface)] z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[var(--brand-accent)] fill-[var(--brand-accent)]" />
              <span>{t.bookmarksDrawer.title}</span>
              <span className="font-latin text-xs text-[var(--brand-muted)] bg-[var(--brand-surface-2)] px-2 py-0.5 rounded-md">
                {bookmarks.length.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
              </span>
            </SheetTitle>
            {bookmarks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--brand-muted)] hover:text-red-400 h-7 text-xs px-2"
                onClick={() => {
                  if (confirmingClear) {
                    clearAll();
                    setConfirmingClear(false);
                  } else {
                    setConfirmingClear(true);
                    setTimeout(() => setConfirmingClear(false), 4000);
                  }
                }}
              >
                {confirmingClear ? (
                  <>
                    <X className="w-3 h-3 ml-1" />
                    {t.bookmarksDrawer.confirmClear}
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 ml-1" />
                    {t.bookmarksDrawer.clearAll}
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--brand-surface-2)] flex items-center justify-center mb-3">
                <Bookmark className="w-5 h-5 text-[var(--brand-muted)]" />
              </div>
              <p className="text-sm text-[var(--brand-text)]">
                {t.bookmarksDrawer.empty}
              </p>
              <p className="text-xs text-[var(--brand-muted)] mt-1">
                {t.bookmarksDrawer.emptyHint}
              </p>
            </div>
          ) : (
            bookmarks.map((b) => {
              const meta = b.category
                ? CATEGORY_META[b.category as keyof typeof CATEGORY_META]
                : null;
              return (
                <article
                  key={b.id}
                  className="card-lift group rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-2)] overflow-hidden"
                >
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {b.image && (
                      <div className="aspect-[16/9] overflow-hidden bg-[var(--brand-bg)]">
                        <img
                          src={b.image}
                          alt={b.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </a>
                  <div className="p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      {meta && (
                        <span className="font-bold" style={{ color: meta.tint }}>
                          {categoryLabel(b.category as any, lang)}
                        </span>
                      )}
                      <span className="text-[var(--brand-muted)]">·</span>
                      <span className="text-[var(--brand-muted)] truncate">
                        {lang === "fa"
                          ? b.sourceNameFa || b.sourceName || ""
                          : b.sourceName || ""}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold line-clamp-2 leading-snug text-[var(--brand-text)]">
                      {b.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-[var(--brand-muted)] flex items-center gap-1 font-latin">
                        <Clock className="w-3 h-3" />
                        {t.bookmarksDrawer.savedAt}{" "}
                        {relativeTime(b.savedAt, lang, t.feed)}
                      </span>
                      <div className="flex items-center gap-1">
                        <a
                          href={b.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-[var(--brand-accent)] transition-colors"
                          aria-label={t.bookmarksDrawer.openArticle}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => removeBookmark(b.id)}
                          className="p-1.5 rounded hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-red-400 transition-colors"
                          aria-label={t.bookmarksDrawer.remove}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Compact icon-button trigger used in the header. */
export function BookmarksButton({
  count,
  onClick,
  active,
}: {
  count: number;
  onClick: () => void;
  active?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      aria-label={t.nav.bookmarks}
      className={cn(
        "relative p-2 rounded-full transition-colors",
        active
          ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
          : "text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)]"
      )}
    >
      <Bookmark className={cn("w-4 h-4", active && "fill-[var(--brand-accent)]")} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[var(--brand-accent)] text-[#04201d] text-[10px] font-bold font-latin">
          {count > 99 ? "99+" : count.toLocaleString("fa-IR")}
        </span>
      )}
    </button>
  );
}
