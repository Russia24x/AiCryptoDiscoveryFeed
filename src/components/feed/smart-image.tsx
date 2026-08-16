"use client";

import { useState, useMemo } from "react";
import { ImageOff } from "lucide-react";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import type { Category } from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src?: string;
  alt: string;
  category: Exclude<Category, "all">;
  sourceId?: string;
  sourceName?: string;
  className?: string;
  /** When true (used in card), use compact "category initial" placeholder.
   *  When false (used in detail/reader), use fuller gradient with source name. */
  variant?: "card" | "detail" | "reader";
  /** Aspect ratio class — defaults to 16/9 */
  aspectClass?: string;
  loading?: "lazy" | "eager";
}

/** Deterministic hash → 0..1 from a string. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const GRADIENTS = [
  // Each: [color1, color2, angle] — teal-heavy palette matching brand
  ["#2dd4bf", "#0d9488", 135],
  ["#38bdf8", "#0284c7", 135],
  ["#a78bfa", "#7c3aed", 135],
  ["#f7931a", "#b45309", 135],
  ["#f472b6", "#be185d", 135],
  ["#2dd4bf", "#0e7490", 135],
  ["#34d399", "#047857", 135],
  ["#60a5fa", "#1e40af", 135],
  ["#fbbf24", "#92400e", 135],
  ["#c084fc", "#6d28d9", 135],
];

export function SmartImage({
  src,
  alt,
  category,
  sourceId = "",
  sourceName = "",
  className,
  variant = "card",
  aspectClass = "aspect-[16/9]",
  loading = "lazy",
}: SmartImageProps) {
  const [imgError, setImgError] = useState(false);
  const { lang } = useLanguage();
  const meta = CATEGORY_META[category];

  const gradient = useMemo(() => {
    const seed = hashString(sourceId + sourceName + category);
    return GRADIENTS[seed % GRADIENTS.length];
  }, [sourceId, sourceName, category]);

  // Generate a 3-letter category prefix in the active language
  const prefix = useMemo(() => {
    const label = categoryLabel(category, lang);
    // Use first 1-2 chars in Persian, 3 in English
    return lang === "fa" ? label.slice(0, 2) : label.slice(0, 3).toUpperCase();
  }, [category, lang]);

  // If src is missing or broken, show placeholder
  if (!src || imgError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden flex items-center justify-center",
          aspectClass,
          className
        )}
        style={{
          background: `linear-gradient(${gradient[2]}deg, ${gradient[0]}26 0%, ${gradient[1]}40 60%, transparent 100%)`,
        }}
      >
        {/* Animated grain texture overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 40%, ${gradient[0]}30 0%, transparent 40%), radial-gradient(circle at 70% 80%, ${gradient[1]}30 0%, transparent 40%)`,
          }}
        />

        {/* Large category letter watermark */}
        <div className="relative flex flex-col items-center gap-2">
          <div
            className="text-4xl md:text-5xl font-bold font-latin leading-none opacity-90"
            style={{ color: gradient[0], textShadow: `0 0 24px ${gradient[0]}40` }}
          >
            {prefix}
          </div>
          {variant !== "card" && (
            <div className="text-[10px] md:text-xs font-latin uppercase tracking-[0.2em] text-[var(--brand-muted)] mt-1 text-center px-3">
              {categoryLabel(category, lang)}
            </div>
          )}
          {variant === "reader" && sourceName && (
            <div className="text-xs text-[var(--brand-muted)] mt-1 px-3 text-center truncate max-w-full">
              {sourceName}
            </div>
          )}
        </div>

        {/* Tiny corner icon */}
        <div className="absolute bottom-2 right-2 opacity-30">
          <ImageOff className="w-3 h-3 text-[var(--brand-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", aspectClass, className)}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading={loading}
      />
    </div>
  );
}
