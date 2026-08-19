"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Filter, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { SOURCES, CATEGORY_META } from "@/lib/sources";
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
 * Modern source filter — horizontal scrollable pill strip.
 *
 * Bug fix history (Phase 13):
 *  - Phase 11 introduced scroll indicators with complex RTL-aware logic.
 *  - Phase 12 fixed the asymmetric indicator bug (only one side appeared).
 *  - But the underlying `overflow-x-auto` element had scrollbar hidden via
 *    `[&::-webkit-scrollbar]:hidden` which in Tailwind 4 means "apply the
 *    `hidden` class to ::-webkit-scrollbar" → display: none. However, the
 *    `[scrollbar-width:none]` was parsed as a CSS variable lookup, not a
 *    style. The net result: scrollbar was hidden BUT in some browsers it
 *    also disabled touch-scrolling because the element's overflow wasn't
 *    properly set.
 *  - In Phase 13, we:
 *    1. Use plain inline `style` for scrollbar hiding (most reliable).
 *    2. Use a `MutationObserver` to detect when content size changes
 *       (so indicators appear/disappear correctly after sources change).
 *    3. Use `ResizeObserver` on the container to recompute on viewport resize.
 *    4. Add touch-action: pan-y so vertical page scroll still works on mobile.
 *    5. Add drag-to-scroll for desktop (mousedown + mousemove).
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
  const dragRef = useRef<{ startX: number; startScroll: number; active: boolean }>({
    startX: 0,
    startScroll: 0,
    active: false,
  });

  const sources = SOURCES.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (s.language !== lang) return false;
    return true;
  });

  /**
   * Recompute scroll indicator visibility.
   *
   * We use `Math.abs(scrollLeft)` to normalize across LTR and RTL — modern
   * browsers (Chrome 85+, FF 64+, Safari 14+) use positive scrollLeft in
   * RTL mode, while older browsers used negative. Using abs handles both.
   */
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) {
      setCanScrollStart(false);
      setCanScrollEnd(false);
      return;
    }
    const progress = Math.abs(el.scrollLeft);
    setCanScrollStart(progress > 2);
    setCanScrollEnd(progress < maxScroll - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    // ResizeObserver — recomputes when the container size changes (e.g.,
    // when a new pill is added or the parent layout shifts).
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);

    // MutationObserver — recomputes when the inner content changes (e.g.,
    // when sources array changes after a category or language switch).
    const mo = new MutationObserver(() => updateScrollState());
    mo.observe(el, { childList: true, subtree: true, attributes: false });

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      ro.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL, sources.length, category, lang, updateScrollState]);

  // Reset scroll position when language changes (LTR↔RTL).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    requestAnimationFrame(updateScrollState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL]);

  /**
   * Scroll the container by ~70% of its visible width in the given
   * visual direction (start = visually toward beginning of content).
   *
   * Sign handling:
   *   - LTR / modern RTL (positive scrollLeft): "end" = +step
   *   - Old RTL (negative scrollLeft): "end" = -step
   * We detect the sign from the current scrollLeft value.
   */
  const scrollByDir = useCallback(
    (dir: "start" | "end") => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const step = el.clientWidth * 0.7;
      const currentProgress = Math.abs(el.scrollLeft);
      const sign = el.scrollLeft < 0 ? -1 : 1;
      const target =
        dir === "end"
          ? Math.min(maxScroll, currentProgress + step)
          : Math.max(0, currentProgress - step);
      el.scrollTo({ left: target * sign, behavior: "smooth" });
    },
    []
  );

  /**
   * Mouse wheel: convert vertical wheel → horizontal scroll.
   * In RTL, the visual direction is reversed, so we flip the delta.
   *
   * NOTE: React 19+ attaches touchmove as passive by default, so we can't
   * preventDefault on touch. But wheel is fine.
   */
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth + 2) return;
    const delta = isRTL ? -e.deltaY : e.deltaY;
    el.scrollBy({ left: delta, behavior: "auto" });
  };

  /**
   * Drag-to-scroll for desktop (mousedown on a pill, drag horizontally).
   * This gives a native app-like feel and works around any scrollbar issues.
   */
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      startX: e.clientX,
      startScroll: el.scrollLeft,
      active: true,
    };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    el.scrollLeft = dragRef.current.startScroll - dx;
  };

  const endDrag = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = "";
      el.style.userSelect = "";
    }
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
        <span className="text-[10px] font-latin text-[var(--brand-muted)]/60 ml-auto" suppressHydrationWarning>
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

      {/* Scrolling pill strip with indicators */}
      <div className="relative">
        {/* Start indicator (left in LTR, right in RTL) */}
        {canScrollStart && (
          <button
            onClick={() => scrollByDir("start")}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full",
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
              "absolute top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full",
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
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1.5 px-1 scroll-smooth cursor-grab"
          style={{
            // Hide scrollbar in all browsers via inline style (most reliable)
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            // Allow horizontal pan with touch (vertical page scroll still works)
            touchAction: "pan-y",
          }}
        >
          {/* WebKit scrollbar hidden via global CSS rule (see globals.css) */}
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
                suppressHydrationWarning
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

          {/* Per-source pills */}
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
                    suppressHydrationWarning
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
