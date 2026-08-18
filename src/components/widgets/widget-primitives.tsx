"use client";

import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for category-specific widget cards.
 *
 * These are extracted from hero.tsx so that category pages can build
 * their own widget grids without duplicating the WidgetCard, SkeletonRow,
 * and FallbackMsg components.
 */

export interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
  className?: string;
  onHeaderClick?: () => void;
  headerTitle?: string;
}

export function WidgetCard({
  title,
  icon,
  accent,
  children,
  className,
  onHeaderClick,
  headerTitle,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]/60 backdrop-blur-sm p-3 md:p-4 overflow-hidden",
        className
      )}
    >
      <div
        className="absolute top-0 end-0 w-px h-full"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
        }}
      />
      <div className="flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-latin font-semibold"
          style={{ color: accent }}
        >
          {icon}
          <span className="truncate max-w-[100px]">{title}</span>
        </div>
        {onHeaderClick && (
          <button
            onClick={onHeaderClick}
            title={headerTitle}
            aria-label={headerTitle}
            className="p-1 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface-2)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="space-y-2">
      <div className="h-7 w-20 shimmer rounded" />
      <div className="h-3 w-14 shimmer rounded" />
    </div>
  );
}

export function FallbackMsg() {
  const { lang } = useLanguage();
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-[var(--brand-muted)]">
      <AlertCircle className="w-3 h-3" />
      <span>{lang === "fa" ? "داده‌ای در دسترس نیست" : "Data unavailable"}</span>
    </div>
  );
}

/** Format a number with Persian digits in FA mode. */
export function formatFa(n: number | string, lang: "fa" | "en"): string {
  const s = String(n);
  return lang === "fa" ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
}

/** Format USD price with thousands separators. */
export function formatUsd(price: number, lang: "fa" | "en"): string {
  const s = price.toLocaleString("en-US", {
    minimumFractionDigits: price < 1 ? 4 : price < 100 ? 2 : 0,
    maximumFractionDigits: price < 1 ? 6 : price < 100 ? 2 : 2,
  });
  return lang === "fa" ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
}

/** Format large numbers compactly (e.g. 1.2B, 3.4M). */
export function formatCompact(n: number, lang: "fa" | "en"): string {
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e12) s = `${(n / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) s = `${(n / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) s = `${(n / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) s = `${(n / 1e3).toFixed(2)}K`;
  else s = n.toFixed(2);
  return lang === "fa" ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
}

/** Returns a font class appropriate for the current language. */
export function numFontClass(lang: "fa" | "en"): string {
  return lang === "fa" ? "font-sans" : "font-latin";
}

/** Map a percent change to a color (green for up, red for down). */
export function changeColor(change: number): string {
  return change >= 0 ? "var(--brand-accent)" : "#f87171";
}
