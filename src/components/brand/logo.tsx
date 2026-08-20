"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_META, categoryLabel, type Language } from "@/lib/sources";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSub?: boolean;
  lang?: Language;
  /**
   * Active category — when provided, shows the category name below
   * the brand with the category's tint color. E.g. on /crypto, the
   * logo shows "Ai24Discovery" with "Crypto" below in orange.
   * Use "all" or omit to show just the brand without a category.
   *
   * Accepts string (not Category) because "social" is a route but
   * not a feed Category.
   */
  activeCategory?: string;
}

/**
 * Ai24Discovery brand logo.
 *
 * Brand colors:
 *   Ai         → Cyan (#00ffff)
 *   24         → White (#ffffff)
 *   Discovery  → Bright Teal (#2dd4bf)
 *
 * When an activeCategory is provided, the category name appears below
 * the brand in the category's tint color:
 *   Crypto        → #f7931a (orange)
 *   AI            → #2dd4bf (teal)
 *   Tech          → #38bdf8 (blue)
 *   Gaming        → #a78bfa (purple)
 *   Entertainment → #f472b6 (pink)
 *   Space         → #e8e6e1 (milky white)
 *   Social        → #ef4444 (red)
 */
export function Logo({
  className,
  size = "md",
  showSub = false,
  lang = "fa",
  activeCategory,
}: LogoProps) {
  const sizes = {
    sm: { brand: "text-base", cat: "text-[10px]", sub: "text-[9px]" },
    md: { brand: "text-xl", cat: "text-[11px]", sub: "text-[10px]" },
    lg: { brand: "text-3xl md:text-4xl", cat: "text-sm md:text-base", sub: "text-xs" },
  } as const;

  const s = sizes[size];

  // Category tint lookup — Social uses red (it's a route, not a feed
  // Category, so it's not in CATEGORY_META).
  const SOCIAL_TINT = "#ef4444";
  const isSocial = activeCategory === "social";
  const meta = !isSocial && activeCategory && activeCategory !== "all"
    ? CATEGORY_META[activeCategory as keyof typeof CATEGORY_META]
    : null;
  const categoryTint = isSocial
    ? SOCIAL_TINT
    : meta?.tint || null;

  // Category display name — ALWAYS English in the logo (not translated).
  // The user specifically requested this: only the logo area should
  // show the English category name, even when the site is in Persian.
  // Special case: AI category shows "AI Lab" instead of just "AI".
  let categoryName: string | null = null;
  if (activeCategory && activeCategory !== "all") {
    if (isSocial) {
      categoryName = "Social";
    } else if (activeCategory === "ai") {
      categoryName = "AI Lab";
    } else if (meta) {
      categoryName = meta.labelEn;
    }
  }

  return (
    <div
      className={cn("flex flex-col items-start leading-none", className)}
      dir="ltr"
    >
      {/* Brand: Ai24Discovery — always LTR regardless of page direction */}
      <div className="flex items-baseline gap-0.5 font-extrabold tracking-tight font-display">
        <span className={cn(s.brand)} style={{ color: "#00ffff" }}>
          Ai
        </span>
        <span className={cn(s.brand)} style={{ color: "#ffffff" }}>
          24
        </span>
        <span className={cn(s.brand)} style={{ color: "#2dd4bf" }}>
          Discovery
        </span>
      </div>

      {/* Active category name — shown below brand with category tint */}
      {categoryName && categoryTint && (
        <span
          className={cn("mt-0.5 font-bold font-display tracking-wide", s.cat)}
          style={{ color: categoryTint }}
        >
          {categoryName}
        </span>
      )}

      {/* Optional sub-tagline */}
      {showSub && (
        <span
          className={cn(
            "mt-1 text-[var(--brand-muted)] font-latin tracking-[0.2em] uppercase",
            s.sub
          )}
        >
          {lang === "fa" ? "آینده · داده · هوشمندی" : "Future · Data · Intelligence"}
        </span>
      )}
    </div>
  );
}
