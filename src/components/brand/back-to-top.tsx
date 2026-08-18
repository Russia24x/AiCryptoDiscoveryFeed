"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating scroll controller.
 *
 * Shows a single subtle pill in the bottom-left corner that:
 *  - Becomes visible after scrolling past one viewport.
 *  - Shows "↑" (top) when scrolled down — click to scroll to top.
 *  - Shows "↓" (bottom) when near the top of the page (rare).
 *  - Hides itself when the user is at the destination.
 *  - Auto-hides after 3 seconds of inactivity (any scroll/click revives it).
 *  - Respects RTL: in RTL layouts, sticks to the right side of the viewport.
 *
 * The pill is intentionally small and semi-transparent so it doesn't
 * visually dominate — just a discrete affordance.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [isRtl, setIsRtl] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastYRef = useRef(0);

  useEffect(() => {
    // Detect RTL from <html dir="rtl"> (set by useLanguage hook)
    const checkRtl = () => {
      setIsRtl(document.documentElement.dir === "rtl");
    };
    checkRtl();
    // Re-check on language change
    const onLang = () => checkRtl();
    window.addEventListener("acd:lang-changed", onLang as EventListener);
    return () => window.removeEventListener("acd:lang-changed", onLang as EventListener);
  }, []);

  const resetHideTimer = useCallback(() => {
    setHidden(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      // Only auto-hide if the user is "in the middle" — keep visible at top/bottom
      const y = window.scrollY;
      const h = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const atTop = y < 50;
      const atBottom = y + h > docH - 50;
      if (!atTop && !atBottom) {
        setHidden(true);
      }
    }, 3500);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const h = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      // Show after one viewport; hide near the very top
      const shouldShow = y > h * 0.4;
      setVisible(shouldShow);
      // Direction: if user is past 50% of the page, button = go up.
      // If user is in the top half, button = go down (to bottom).
      setDirection(y < docH / 2 - h / 2 ? "down" : "up");
      lastYRef.current = y;
      resetHideTimer();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  const onClick = useCallback(() => {
    if (direction === "up") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const docH = document.documentElement.scrollHeight;
      window.scrollTo({ top: docH, behavior: "smooth" });
    }
  }, [direction]);

  // Position: in RTL, place on bottom-right (because the language toggle is on the right side
  // and we don't want overlap with the bookmarks/settings icons that are top-right).
  // In LTR, place on bottom-left.
  const sideClass = isRtl ? "right-4 sm:right-5" : "left-4 sm:left-5";

  return (
    <button
      onClick={onClick}
      aria-label={direction === "up" ? "بازگشت به بالا" : "رفتن به پایین"}
      className={cn(
        "fixed bottom-4 sm:bottom-5 z-40",
        sideClass,
        "group flex items-center gap-1.5 px-3 py-2 rounded-full",
        "bg-[var(--brand-surface)]/80 backdrop-blur-md",
        "border border-[var(--brand-border)]",
        "text-[var(--brand-muted)] hover:text-[var(--brand-accent)]",
        "hover:border-[var(--brand-accent)]/40 hover:bg-[var(--brand-surface)]",
        "shadow-lg shadow-black/20",
        "transition-all duration-300",
        visible && !hidden
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      {direction === "up" ? (
        <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
      ) : (
        <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
      )}
      <span className="text-[10px] font-latin uppercase tracking-wider hidden sm:inline">
        {direction === "up" ? "Top" : "End"}
      </span>
    </button>
  );
}
