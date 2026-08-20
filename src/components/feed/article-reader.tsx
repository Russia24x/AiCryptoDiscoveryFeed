"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  ExternalLink,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Share2,
  Check,
  Minus,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import type { FeedItem } from "@/types/feed";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { relativeTime } from "@/hooks/use-feed-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SmartImage } from "./smart-image";
import { ImageLightbox } from "./image-lightbox";
import { cn } from "@/lib/utils";

const FONT_SIZE_KEY = "acd:reader-font-size";
const FONT_SIZES = [14, 15, 16, 17, 18, 19, 20, 22, 24];
const DEFAULT_FONT_SIZE_IDX = 1; // 15px

interface ArticleReaderProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigation callbacks — used by arrow keys / chevrons */
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

interface ArticleData {
  title: string;
  html: string;
  text: string;
  excerpt: string;
  images: string[];
  author?: string;
  publishedDate?: string;
  siteName?: string;
  favicon?: string;
  wordCount: number;
  readingTimeMinutes: number;
  sourceUrl: string;
  strategy?: string;
  error?: string;
  message?: string;
  fetchedAt?: string;
}

export function ArticleReader({
  item,
  open,
  onOpenChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: ArticleReaderProps) {
  const { t, lang, isRTL } = useLanguage();
  const { isBookmarked, toggleBookmark, hydrated } = useBookmarks();

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reading progress (0-100)
  const [progress, setProgress] = useState(0);
  // Font size index into FONT_SIZES
  const [fontSizeIdx, setFontSizeIdx] = useState(DEFAULT_FONT_SIZE_IDX);
  // Share feedback
  const [shareCopied, setShareCopied] = useState(false);
  // Image lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Ref to the scrollable sheet content for progress tracking
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load font size from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FONT_SIZE_KEY);
      if (raw) {
        const idx = parseInt(raw, 10);
        if (!isNaN(idx) && idx >= 0 && idx < FONT_SIZES.length) {
          setFontSizeIdx(idx);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setFontSize = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(FONT_SIZES.length - 1, idx));
    setFontSizeIdx(clamped);
    try {
      window.localStorage.setItem(FONT_SIZE_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  // Track scroll position for progress bar
  // We query the DOM directly because ref forwarding to SheetPrimitive can be finicky
  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    const id = window.setTimeout(() => {
      // The sheet content is the element with data-slot="sheet-content"
      const el = document.querySelector<HTMLDivElement>(
        '[data-slot="sheet-content"]'
      );
      if (!el) return;
      scrollRef.current = el;
      const onScroll = () => {
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight - el.clientHeight;
        if (scrollHeight > 0) {
          setProgress(
            Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100))
          );
        }
      };
      el.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      // Store cleanup on the el for the return below
      (el as any)._cleanupScroll = () => el.removeEventListener("scroll", onScroll);
    }, 200);

    return () => {
      window.clearTimeout(id);
      const el = scrollRef.current;
      if (el && (el as any)._cleanupScroll) {
        (el as any)._cleanupScroll();
        delete (el as any)._cleanupScroll;
      }
    };
  }, [open, article]);

  // Share handler
  const onShare = useCallback(async () => {
    if (!item?.link) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: article?.title || item.title,
          url: item.link,
        });
      } else {
        await navigator.clipboard.writeText(item.link);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // user cancelled or copy failed
    }
  }, [item, article]);

  // Fetch full article content via /api/article proxy
  const fetchArticle = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setArticle(null);

    try {
      const res = await fetch(
        `/api/article?url=${encodeURIComponent(url)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: ArticleData = await res.json();
      if (data.error) {
        setError(data.message || data.error);
      } else {
        setArticle(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && item?.link) {
      fetchArticle(item.link);
    } else if (!open) {
      // Reset on close
      setArticle(null);
      setError(null);
      setLoading(false);
    }
  }, [open, item, fetchArticle]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      else if (e.key === "ArrowLeft") (isRTL ? onNext : onPrev)?.();
      else if (e.key === "ArrowRight") (isRTL ? onPrev : onNext)?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, onPrev, onNext, isRTL]);

  if (!item) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isRTL ? "left" : "right"}
          className="w-full sm:w-[680px] md:w-[800px] bg-[var(--brand-bg)] border-s border-[var(--brand-border)] p-0"
        >
          <div className="p-8 text-center text-[var(--brand-muted)]">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t.detail.noPreview}</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const meta = CATEGORY_META[item.source.category];
  const bookmarked = hydrated && isBookmarked(item.id);
  const sourceDisplayName =
    lang === "fa" ? item.source.nameFa || item.source.name : item.source.name;

  let host = "";
  try {
    host = new URL(item.link).hostname;
  } catch {
    host = "";
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? "left" : "right"}
        className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:w-[1200px] sm:max-w-none h-full sm:h-full bg-[var(--brand-bg)] border-s border-[var(--brand-border)] p-0 overflow-y-auto"
      >
        {/* Visually-hidden title for accessibility (per Radix Dialog requirement) */}
        <SheetHeader className="sr-only">
          <SheetTitle>
            {article?.title || item.title}
          </SheetTitle>
        </SheetHeader>

        {/* Reading progress bar — fixed at top of sheet.
            Uses scaleX instead of width so it automatically mirrors in RTL
            (the parent has dir="rtl" via <html> and scaleX transforms are
            direction-aware when using `transform-origin: start`). */}
        <div className="sticky top-0 z-30 h-1 bg-[var(--brand-bg)]/95">
          <div
            className="h-full bg-gradient-to-r from-[var(--brand-accent)] to-[#38bdf8] transition-transform duration-150 ease-out origin-start"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        {/* Sticky header bar with close + nav */}
        <div className="sticky top-1 z-20 flex items-center justify-between px-4 py-3 bg-[var(--brand-bg)]/95 backdrop-blur-xl border-b border-[var(--brand-border)]">
          <div className="flex items-center gap-2 min-w-0">
            {meta && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
                style={{
                  backgroundColor: "var(--brand-accent-soft)",
                  color: meta.tint,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: meta.tint }}
                />
                {categoryLabel(item.source.category, lang)}
              </span>
            )}
            <span className="text-[11px] text-[var(--brand-muted)] truncate">
              {sourceDisplayName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Bookmark */}
            <button
              onClick={() =>
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
                })
              }
              aria-label={bookmarked ? t.detail.unbookmark : t.detail.bookmark}
              className={cn(
                "p-2 rounded-full transition-colors",
                bookmarked
                  ? "text-[var(--brand-accent)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)]"
              )}
            >
              {bookmarked ? (
                <BookmarkCheck className="w-4 h-4 fill-[var(--brand-accent)]" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Font size controls — hidden on mobile (compact) */}
            <div className="hidden sm:flex items-center bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full p-0.5">
              <button
                onClick={() => setFontSize(fontSizeIdx - 1)}
                disabled={fontSizeIdx === 0}
                aria-label={lang === "fa" ? "کاهش اندازه فونت" : "Decrease font size"}
                className="p-1 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-latin text-[var(--brand-muted)] px-1 min-w-[24px] text-center">
                {FONT_SIZES[fontSizeIdx]}
              </span>
              <button
                onClick={() => setFontSize(fontSizeIdx + 1)}
                disabled={fontSizeIdx === FONT_SIZES.length - 1}
                aria-label={lang === "fa" ? "افزایش اندازه فونت" : "Increase font size"}
                className="p-1 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={onShare}
              aria-label={lang === "fa" ? "اشتراک‌گذاری" : "Share"}
              className={cn(
                "p-2 rounded-full transition-colors",
                shareCopied
                  ? "text-[var(--brand-accent)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)]"
              )}
            >
              {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Prev / Next chevrons */}
            {hasPrev && (
              <button
                onClick={onPrev}
                aria-label="Previous article"
                className="p-2 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)] transition-colors"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            {hasNext && (
              <button
                onClick={onNext}
                aria-label="Next article"
                className="p-2 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)] transition-colors"
              >
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => onOpenChange(false)}
              aria-label={t.detail.closeDialog}
              className="p-2 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Article body — scrollable */}
        <article className="px-5 py-6 md:px-10 md:py-10 lg:px-16 lg:py-12 max-w-4xl mx-auto">
          {/* Hero image (from RSS or fallback SmartImage) */}
          {(item.image || true) && (
            <SmartImage
              src={item.image}
              alt={item.title}
              category={item.source.category}
              articleUrl={item.link}
              sourceId={item.source.id}
              sourceName={sourceDisplayName}
              variant="reader"
              aspectClass="aspect-[16/9] md:aspect-[21/9] rounded-xl mb-6"
              loading="eager"
            />
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-[1.25] tracking-tight text-[var(--brand-text)]">
            {article?.title || item.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-3 mt-4 pb-4 border-b border-[var(--brand-border)] text-xs text-[var(--brand-muted)]">
            <div className="flex items-center gap-1.5">
              {article?.favicon && (
                <img
                  src={article.favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="font-medium">{sourceDisplayName}</span>
              {article?.siteName && article?.siteName !== sourceDisplayName && (
                <span className="opacity-60">· {article.siteName}</span>
              )}
            </div>

            {article?.author && (
              <span className="font-latin">· {article.author}</span>
            )}

            <span className="flex items-center gap-1 font-latin">
              <Clock className="w-3 h-3" />
              {relativeTime(article?.publishedDate || item.pubDate, lang, t.feed)}
            </span>

            {article && article.readingTimeMinutes > 0 && (
              <span className="flex items-center gap-1 font-latin">
                <BookOpen className="w-3 h-3" />
                {article.readingTimeMinutes.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}{" "}
                {t.feed.minutesShort}
                {article.wordCount > 0 && (
                  <span className="opacity-50 ms-1">
                    · {article.wordCount.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} words
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-accent)]" />
              <p className="text-sm text-[var(--brand-muted)]">
                {lang === "fa" ? "در حال بارگذاری مقاله..." : "Loading article..."}
              </p>
            </div>
          )}

          {/* Error state — fallback to description */}
          {!loading && error && (
            <div className="py-8">
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-300">
                    {lang === "fa"
                      ? "محتوای کامل بارگذاری نشد"
                      : "Full content unavailable"}
                  </p>
                  <p className="text-yellow-200/70 mt-0.5">
                    {lang === "fa"
                      ? "متن کوتاه زیر نمایش داده می‌شود. برای خواندن کامل به منبع مراجعه کنید."
                      : "Showing the RSS excerpt below. Visit the source to read the full article."}
                  </p>
                </div>
              </div>

              {item.description && (
                <p className="text-base md:text-lg text-[var(--brand-text)] leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          )}

          {/* Article content — full HTML rendered */}
          {!loading && !error && article && (
            <>
              {article.html ? (
                <div
                  className="article-body mt-6 text-[var(--brand-text)] leading-[1.85]"
                  style={{ fontSize: `${FONT_SIZES[fontSizeIdx]}px` }}
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: article.html }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    // Open image lightbox when clicking article body images
                    // — but only if the image is NOT inside a link (otherwise
                    // we let the link click go through with target=_blank).
                    const isImg = target.tagName === "IMG";
                    const isInsideLink = target.closest("a");
                    if (isImg && !isInsideLink) {
                      e.preventDefault();
                      const allImgs = Array.from(
                        e.currentTarget.querySelectorAll("img")
                      );
                      const idx = allImgs.indexOf(target as HTMLImageElement);
                      if (idx >= 0) setLightboxIdx(idx);
                    }
                    // For images inside links: open lightbox instead of following link
                    if (isImg && isInsideLink) {
                      e.preventDefault();
                      const allImgs = Array.from(
                        e.currentTarget.querySelectorAll("img")
                      );
                      const idx = allImgs.indexOf(target as HTMLImageElement);
                      if (idx >= 0) setLightboxIdx(idx);
                    }
                  }}
                />
              ) : (
                <div className="mt-6">
                  {item.description && (
                    <p className="text-base md:text-lg text-[var(--brand-text)] leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  <p className="text-sm text-[var(--brand-muted)] mt-4 italic">
                    {lang === "fa"
                      ? "محتوای کامل در منبع اصلی در دسترس است."
                      : "Full content available at the source."}
                  </p>
                </div>
              )}

              {/* Image gallery */}
              {article.images && article.images.length > 1 && (
                <div className="mt-10 pt-6 border-t border-[var(--brand-border)]">
                  <h3 className="text-xs font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">
                    {lang === "fa" ? "تصاویر" : "Images"} ({article.images.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {article.images.slice(0, 9).map((img, i) => (
                      <a
                        key={i}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square overflow-hidden rounded-lg bg-[var(--brand-surface-2)] group"
                      >
                        <img
                          src={img}
                          alt={`${article.title || "image"} - ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer actions */}
          <div className="mt-10 pt-6 border-t border-[var(--brand-border)] flex flex-wrap items-center justify-between gap-3">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--brand-muted)] hover:text-[var(--brand-accent)] transition-colors flex items-center gap-1.5"
            >
              <span className="font-latin truncate max-w-[200px]">{host}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110 transition"
            >
              {t.detail.readFull}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Keyboard nav hint */}
          <p className="mt-6 text-[10px] text-[var(--brand-muted)] text-center font-latin opacity-50">
            {lang === "fa"
              ? "ESC برای بستن · ← → برای پیمایش مقالات"
              : "ESC to close · ← → to navigate"}
          </p>
        </article>

        {/* Image lightbox — opens when clicking article body image */}
        {article?.images && article.images.length > 0 && lightboxIdx !== null && (
          <ImageLightbox
            images={article.images}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            title={article.title || item.title}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
