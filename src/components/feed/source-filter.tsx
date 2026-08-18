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

  // Update scroll indicators based on current scroll position
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    // In RTL, scrollLeft is negative or starts at right side.
    // Use scrollWidth + scrollLeft to compute right edge in LTR,
    // and left edge in RTL via Math.abs(scrollLeft).
    const scrollStart = isRTL
      ? el.scrollLeft > 0
      : el.scrollLeft > 4;
    const scrollEnd = isRTL
      ? el.scrollLeft > -(el.scrollWidth - el.clientWidth - 4)
      : el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
    setCanScrollStart(scrollStart);
    setCanScrollEnd(scrollEnd);
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
  }, [isRTL, sources.length]);

  // Click on scroll indicator → scroll the container
  const scrollByDir = (dir: "start" | "end") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    const dirSign = dir === "start" ? -1 : 1;
    const rtlSign = isRTL ? -1 : 1;
    el.scrollBy({ left: amount * dirSign * rtlSign, behavior: "smooth" });
  };

  // Mouse wheel: convert vertical wheel → horizontal scroll on the strip
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // user already scrolling horizontally
    const el = scrollRef.current;
    if (!el) return;
    // Only hijack wheel if the strip can scroll horizontally
    if (el.scrollWidth <= el.clientWidth + 2) return;
    e.preventDefault?.();
    el.scrollBy({ left: e.deltaY, behavior: "auto" });
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
          </button>

          {/* Per-source pills with colored dots */}
          {sources.map((src) => {
            const meta = CATEGORY_META[src.category];
            const active = activeSourceId === src.id;
            const displayName = lang === "fa" ? src.nameFa : src.name;

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
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
