"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pull-to-refresh hook + indicator overlay.
 *
 * Implements native-style pull-to-refresh for touch devices.
 *
 * Behavior:
 *  - Activates ONLY when:
 *    1. User is on a touch device (pointer: coarse)
 *    2. Window scrollY is at the very top (0)
 *  - User drags down from the top → spinner appears and grows with drag distance.
 *  - If user drags past THRESHOLD (80px), release triggers onRefresh.
 *  - If user releases before THRESHOLD, the indicator bounces back.
 *  - The indicator is rendered as a child overlay, NOT a fixed full-screen element,
 *    so it doesn't block interaction with the rest of the page.
 *
 * The hook returns:
 *  - touchHandlers: spread on the element you want to monitor
 *  - pullDistance: current drag distance (0..MAX_PULL)
 *  - isRefreshing: true while onRefresh() promise is pending
 *  - PullIndicator: a React component to render the visual indicator
 */
interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Threshold in pixels to trigger refresh. Default: 80. */
  threshold?: number;
  /** Maximum pull distance in pixels (rubber-band effect). Default: 120. */
  maxPull?: number;
}

interface PullToRefreshResult {
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  pullDistance: number;
  isRefreshing: boolean;
  PullIndicator: React.FC;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions): PullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Detect touch device — only activate on touchscreens to avoid hijacking
  // mouse drag on desktop.
  const isTouchDevice = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    isTouchDevice.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      isTouchDevice.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice.current) return;
    // Only start tracking if the user is at the very top of the page
    if (window.scrollY > 0) return;
    startYRef.current = e.touches[0]?.clientY ?? null;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouchDevice.current) return;
      if (startYRef.current === null) return;
      if (isRefreshing) return;
      const currentY = e.touches[0]?.clientY;
      if (currentY === undefined) return;
      const delta = currentY - startYRef.current;
      // Only activate for downward drag (positive delta)
      if (delta <= 0) {
        isDraggingRef.current = false;
        setPullDistance(0);
        return;
      }
      // Make sure the user is still at the top of the page (they might have
      // started the touch at the top but then scrolled). If they've scrolled
      // down, abandon the pull.
      if (window.scrollY > 0) {
        isDraggingRef.current = false;
        setPullDistance(0);
        startYRef.current = null;
        return;
      }
      isDraggingRef.current = true;
      // Rubber-band: the further you pull, the slower it grows.
      // Use sqrt for a nice diminishing-returns curve.
      const rubberBand = Math.sqrt(delta) * 8;
      const clamped = Math.min(maxPull, rubberBand);
      setPullDistance(clamped);
      // Prevent default scroll ONLY while we're actively pulling — otherwise
      // we'd block normal page scroll.
      if (clamped > 1 && e.cancelable) {
        e.preventDefault();
      }
    },
    [isRefreshing, maxPull]
  );

  const onTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) {
      startYRef.current = null;
      setPullDistance(0);
      return;
    }
    isDraggingRef.current = false;
    startYRef.current = null;
    // If user released past threshold, trigger refresh.
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold); // snap to threshold while refreshing
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Bounce back to 0
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  const PullIndicator = useCallback<React.FC>(() => {
    const progress = Math.min(1, pullDistance / threshold);
    const rotation = isRefreshing ? 360 : progress * 270;
    const showSpinner = isRefreshing || pullDistance > 4;
    if (!showSpinner) return null;
    return (
      <div
        className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center justify-center"
        style={{
          top: `${pullDistance - 32}px`,
          transition: isRefreshing ? "none" : "top 0.25s ease-out",
        }}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center",
            "bg-[var(--brand-surface)] border border-[var(--brand-border)]",
            "shadow-lg shadow-black/30 backdrop-blur-md"
          )}
          style={{
            transform: `scale(${0.8 + progress * 0.4}) rotate(${rotation}deg)`,
            transition: isRefreshing ? "transform 0.6s linear infinite" : "transform 0.2s ease-out",
          }}
        >
          {isRefreshing ? (
            <RefreshCw className="w-4 h-4 text-[var(--brand-accent)] animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                "w-4 h-4 transition-colors",
                progress >= 1 ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)]"
              )}
            />
          )}
        </div>
        <span
          className="absolute top-11 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[var(--brand-muted)] whitespace-nowrap"
          style={{ opacity: progress > 0.3 ? 1 : 0 }}
        >
          {isRefreshing
            ? "در حال به‌روزرسانی…"
            : progress >= 1
            ? "رها کن برای به‌روزرسانی"
            : "برای به‌روزرسانی پایین بکش"}
        </span>
      </div>
    );
  }, [pullDistance, isRefreshing, threshold]);

  return {
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    pullDistance,
    isRefreshing,
    PullIndicator,
  };
}
