"use client";

import { useRef, useState, useEffect } from "react";
import { Filter, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { SOURCES, CATEGORY_META, categoryLabel } from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface SourceFilterProps {
  category: string;
  activeSourceId: string | null;
  onSourceChange: (sourceId: string | null) => void;
  /** Optional: counts of items per source, used to display a small badge. */
  sourceCounts?: Record<string, number>;
  /** Optional: total count of items (used for the "All sources" badge). */
  totalItems?: number;
}

/**
 * Modern source filter — horizontal scrollable pill strip with:
 * - Source-colored dot indicators
 * - Active state with filled background + check icon
 * - "All sources" pill as default
 * - Smooth hover transitions
 * - Category-tinted backgrounds per source
 * - Left/right scroll indicators that fade in/out based on scroll position
 * - Mouse wheel + drag-to-scroll support
 * - Smooth scroll behavior
 */
export function SourceFilter({
  category,
  activeSourceId,
  onSourceChange,
  sourceCounts,
  totalItems,
}: SourceFilterProps) {
  const { t, lang, isRTL } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  // Filter sources by BOTH category AND current UI language
  const sources = SOURCES.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (s.language !== lang) return false;
    return true;
  });

  // Update scroll indicators based on current scroll position.
  //
  // Cross-browser RTL handling:
  //   - Modern browsers (Chrome 85+, Firefox 64+, Safari 14+): in RTL mode,
  //     scrollLeft goes from 0 (right-most) to scrollWidth - clientWidth (left-most),
  //     i.e. NEGATIVE direction is reversed but the value is positive.
  //   - Older browsers: scrollLeft was negative in RTL.
  // We normalize by computing a "scroll progress" in [0, 1] which is
  // direction-independent.
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setCanScrollStart(false);
      setCanScrollEnd(false);
      return;
    }
    // Normalize scrollLeft: always in [0, maxScroll] regardless of direction.
    // In LTR: scrollLeft goes 0 → maxScroll.
    // In RTL (modern): scrollLeft goes 0 → maxScroll (positive, but the
    //   visual direction is reversed).
    // In RTL (old): scrollLeft goes 0 → -maxScroll.
    const sl = el.scrollLeft;
    const progress = Math.abs(sl); // works for both positive (LTR+modern RTL) and negative (old RTL)
    const atStart = progress <= 2;
    const atEnd = progress >= maxScroll - 2;
    setCanScrollStart(!atStart);
    setCanScrollEnd(!atEnd);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    // Re-check on resize
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL, sources.length, category, lang]);

  // When the language changes (LTR↔RTL), reset scroll to the start so the
  // indicators are in the correct initial state.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    // Defer state update so the new scroll position is reflected.
    requestAnimationFrame(updateScrollState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL]);

  // Click on scroll indicator → scroll the container by ~70% of viewport.
  //
  // Direction handling:
  //   - "start" = visually scroll toward the beginning of content
  //   - "end"   = visually scroll toward the end of content
  //
  // In RTL mode (modern browsers): scrollLeft=0 is at the right edge of content
  // (visually the start), and scrollLeft=maxScroll is at the left edge (visually
  // the end). So scrolling "end" means INCREASING scrollLeft, same as LTR.
  //
  // To be robust across browser variants (old RTL where scrollLeft is negative),
  // we compute the target scroll position from |scrollLeft| and re-apply with
  // the correct sign for the current browser.
  const scrollByDir = (dir: "start" | "end") => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const step = el.clientWidth * 0.7;
    const currentProgress = Math.abs(el.scrollLeft);
    const sign = el.scrollLeft < 0 ? -1 : 1; // detect old-RTL negative mode
    const target =
      dir === "end"
        ? Math.min(maxScroll, currentProgress + step)
        : Math.max(0, currentProgress - step);
    el.scrollTo({ left: target * sign, behavior: "smooth" });
  };

  // Mouse wheel: convert vertical wheel → horizontal scroll on the strip.
  //
  // In RTL mode (modern browsers), scrolling down should move content to the
  // right visually, which means scrollLeft should DECREASE. But wheel deltaY
  // is positive when scrolling down, so we need to invert it in RTL.
  // (In old RTL where scrollLeft is negative, the same logic applies because
  // we use the sign-detection approach in scrollByDir.)
  //
  // To keep this simple and consistent, we detect the current "direction sign"
  // by reading scrollLeft after the user starts scrolling, and apply the
  // correct delta direction.
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // user already scrolling horizontally
    const el = scrollRef.current;
    if (!el) return;
    // Only hijack wheel if the strip can scroll horizontally
    if (el.scrollWidth <= el.clientWidth + 2) return;
    // In RTL mode, the visual direction is reversed, so we flip the delta.
    const delta = isRTL ? -e.deltaY : e.deltaY;
    el.scrollBy({ left: delta, behavior: "auto" });
  };

  if (sources.length === 0) return null;

  return (
    <div className="mb-4 -mt-2">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <Filter className="w-3.5 h-3.5 text-[var(--brand-muted)]" />
        <span className="text-[11px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
          {t.feed.sourceFilter}
        </span>
        <span className="text-[10px] font-latin text-[var(--brand-muted)]/60 ml-auto">
          {sources.length} {lang === "fa" ? "منبع" : "sources"}
        </span>
        {activeSourceId && (
          <button
            onClick={() => onSourceChange(null)}
            className="text-[11px] text-[var(--brand-accent)] hover:underline flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/30"
          >
            <X className="w-3 h-3" />
            {t.feed.clearFilter}
          </button>
        )}
      </div>

      {/* Scrolling pill strip — with left/right scroll indicators */}
      <div className="relative">
        {/* Start indicator (left in LTR, right in RTL) */}
        {canScrollStart && (
          <button
            onClick={() => scrollByDir("start")}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full",
              "flex items-center justify-center",
              "bg-[var(--brand-surface)] border border-[var(--brand-border)] shadow-lg",
              "text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40",
              "transition-all",
              isRTL ? "right-0" : "left-0"
            )}
            aria-label={lang === "fa" ? "اسکرول به راست" : "Scroll left"}
          >
            {isRTL ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
        {/* End indicator (right in LTR, left in RTL) */}
        {canScrollEnd && (
          <button
            onClick={() => scrollByDir("end")}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full",
              "flex items-center justify-center",
              "bg-[var(--brand-surface)] border border-[var(--brand-border)] shadow-lg",
              "text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40",
              "transition-all",
              isRTL ? "left-0" : "right-0"
            )}
            aria-label={lang === "fa" ? "اسکرول به چپ" : "Scroll right"}
          >
            {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}

        <div
          ref={scrollRef}
          onWheel={onWheel}
          className="flex gap-2 overflow-x-auto pb-1.5 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        >
          {/* "All sources" pill */}
          <button
            onClick={() => onSourceChange(null)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              activeSourceId === null
                ? "bg-[var(--brand-accent)] text-[#04201d] font-bold shadow-md shadow-[var(--brand-accent)]/20"
                : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40 hover:bg-[var(--brand-surface-2)]"
            )}
          >
            {activeSourceId === null && <Check className="w-3 h-3" />}
            {t.feed.allSources}
            {typeof totalItems === "number" && totalItems > 0 && (
              <span
                className={cn(
                  "min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[9px] font-latin font-bold",
                  activeSourceId === null
                    ? "bg-[#04201d]/20 text-[#04201d]"
                    : "bg-[var(--brand-bg)]/40 text-[var(--brand-muted)]"
                )}
              >
                {lang === "fa"
                  ? totalItems.toString().replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])
                  : totalItems}
              </span>
            )}
          </button>

          {/* Per-source pills with colored dots */}
          {sources.map((src) => {
            const meta = CATEGORY_META[src.category];
            const active = activeSourceId === src.id;
            const displayName = lang === "fa" ? src.nameFa : src.name;
            const count = sourceCounts?.[src.id];

            return (
              <button
                key={src.id}
                onClick={() => onSourceChange(active ? null : src.id)}
                className={cn(
                  "shrink-0 flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap group",
                  active
                    ? "text-[#04201d] font-bold shadow-md"
                    : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40 hover:bg-[var(--brand-surface-2)]"
                )}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${meta?.tint || "#2dd4bf"}, ${meta?.tint || "#2dd4bf"}dd)`,
                        boxShadow: `0 2px 12px ${meta?.tint || "#2dd4bf"}40`,
                      }
                    : undefined
                }
              >
                {/* Color indicator dot */}
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125",
                    active && "ring-2 ring-[#04201d]/20"
                  )}
                  style={{
                    backgroundColor: active ? "#04201d" : meta?.tint,
                  }}
                />
                {displayName}
                {typeof count === "number" && count > 0 && (
                  <span
                    className={cn(
                      "min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-latin font-bold",
                      active
                        ? "bg-[#04201d]/20 text-[#04201d]"
                        : "bg-[var(--brand-bg)]/40 text-[var(--brand-muted)]"
                    )}
                  >
                    {lang === "fa"
                      ? count.toString().replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])
                      : count}
                  </span>
                )}
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
