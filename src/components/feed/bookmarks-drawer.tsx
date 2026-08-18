"use client";

import { useState, useEffect } from "react";
import { Bookmark, X, ExternalLink, Clock, ArrowRight, ArrowLeft, Trash2, Clock3, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useReadLater, formatExpiry } from "@/hooks/use-read-later";
import { useLanguage } from "@/hooks/use-language";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { relativeTime } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookmarksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "bookmarks" | "readlater";

export function BookmarksDrawer({ open, onOpenChange }: BookmarksDrawerProps) {
  const { bookmarks, removeBookmark, clearAll } = useBookmarks();
  const { entries, removeFromQueue, clearAll: clearQueue, pruneNow, count: queueCount } = useReadLater();
  const { t, lang, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("bookmarks");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const Back = isRTL ? ArrowLeft : ArrowRight;

  // Periodically prune expired read-later entries while the drawer is open.
  useEffect(() => {
    if (!open) return;
    pruneNow();
    const id = setInterval(pruneNow, 60_000);
    return () => clearInterval(id);
  }, [open, pruneNow]);

  const onClearAll = () => {
    if (activeTab === "bookmarks") {
      clearAll();
      toast.success(
        lang === "fa" ? "همه نشانک‌ها پاک شدند" : "All bookmarks cleared",
        { duration: 1800 }
      );
    } else {
      clearQueue();
      toast.success(
        lang === "fa" ? "صف خواندن پاک شد" : "Read-later queue cleared",
        { duration: 1800 }
      );
    }
    setConfirmingClear(false);
  };

  const entriesList = activeTab === "bookmarks" ? bookmarks : entries;
  const isEmpty = entriesList.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={lang === "fa" ? "left" : "right"}
        className="w-full sm:w-[440px] bg-[var(--brand-surface)] border-l border-[var(--brand-border)] p-0 overflow-y-auto"
      >
        {/* Header — with Back button + tab switcher */}
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-[var(--brand-border)] sticky top-0 bg-[var(--brand-surface)] z-10">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-[var(--brand-surface-2)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors group"
              aria-label={lang === "fa" ? "بازگشت" : "Back"}
            >
              <Back className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-medium">
                {lang === "fa" ? "بازگشت" : "Back"}
              </span>
            </button>
            <div className="h-4 w-px bg-[var(--brand-border)]" />
            <SheetTitle className="flex-1 text-sm">
              {activeTab === "bookmarks"
                ? t.bookmarksDrawer.title
                : lang === "fa"
                ? "صف خواندن"
                : "Read Later"}
            </SheetTitle>
            {entriesList.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--brand-muted)] hover:text-red-400 h-7 text-xs px-2"
                onClick={() => {
                  if (confirmingClear) {
                    onClearAll();
                  } else {
                    setConfirmingClear(true);
                    setTimeout(() => setConfirmingClear(false), 4000);
                  }
                }}
              >
                {confirmingClear ? (
                  <>
                    <Trash2 className="w-3 h-3 ml-1" />
                    {t.bookmarksDrawer.confirmClear}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 ml-1" />
                    {t.bookmarksDrawer.clearAll}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-[var(--brand-surface-2)] rounded-lg">
            <TabButton
              active={activeTab === "bookmarks"}
              onClick={() => setActiveTab("bookmarks")}
              icon={<Bookmark className="w-3.5 h-3.5" />}
              label={t.bookmarksDrawer.title}
              count={bookmarks.length}
              lang={lang}
              accent="var(--brand-accent)"
            />
            <TabButton
              active={activeTab === "readlater"}
              onClick={() => setActiveTab("readlater")}
              icon={<Clock3 className="w-3.5 h-3.5" />}
              label={lang === "fa" ? "صف خواندن" : "Read Later"}
              count={queueCount}
              lang={lang}
              accent="#f59e0b"
            />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {isEmpty ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--brand-surface-2)] flex items-center justify-center mb-3">
                {activeTab === "bookmarks" ? (
                  <Bookmark className="w-5 h-5 text-[var(--brand-muted)]" />
                ) : (
                  <Clock3 className="w-5 h-5 text-[var(--brand-muted)]" />
                )}
              </div>
              <p className="text-sm text-[var(--brand-text)]">
                {activeTab === "bookmarks"
                  ? t.bookmarksDrawer.empty
                  : lang === "fa"
                  ? "صف خواندن خالی است"
                  : "Read-later queue is empty"}
              </p>
              <p className="text-xs text-[var(--brand-muted)] mt-1">
                {activeTab === "bookmarks"
                  ? t.bookmarksDrawer.emptyHint
                  : lang === "fa"
                  ? "روی آیکن ساعت هر مقاله بزن تا اینجا اضافه شود. پس از ۷ روز خودکار حذف می‌شود."
                  : "Tap the clock icon on any article to add it here. Auto-expires after 7 days."}
              </p>
            </div>
          ) : (
            entriesList.map((b) => {
              const meta = b.category
                ? CATEGORY_META[b.category as keyof typeof CATEGORY_META]
                : null;
              const isReadLater = activeTab === "readlater";
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
                        {isReadLater ? (
                          <>
                            <Clock3 className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-400/80">
                              {formatExpiry(b as any, lang)}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            {t.bookmarksDrawer.savedAt}{" "}
                            {relativeTime(b.savedAt, lang, t.feed)}
                          </>
                        )}
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
                          onClick={() => {
                            if (isReadLater) {
                              removeFromQueue(b.id);
                              toast(
                                lang === "fa"
                                  ? "از صف خواندن حذف شد"
                                  : "Removed from read-later",
                                { duration: 1500 }
                              );
                            } else {
                              removeBookmark(b.id);
                              toast(
                                lang === "fa" ? "نشانک حذف شد" : "Bookmark removed",
                                { duration: 1500 }
                              );
                            }
                          }}
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

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  lang,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  lang: "fa" | "en";
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
        active
          ? "bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-sm"
          : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
      )}
      style={active ? { color: accent } : undefined}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span
          className={cn(
            "min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-latin",
            active ? "text-white" : ""
          )}
          style={{ backgroundColor: accent, color: active ? "#04201d" : "white" }}
        >
          {count > 99
            ? "99+"
            : lang === "fa"
            ? count.toString().replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])
            : count}
        </span>
      )}
    </button>
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
