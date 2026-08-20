"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Loader2,
  Network,
  Sparkles,
  Bitcoin,
  Brain,
  Cpu,
  Gamepad2,
  Film,
  Rocket,
} from "lucide-react";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import type { Category } from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src?: string;
  alt: string;
  category: Exclude<Category, "all">;
  /** Source article URL — used to lazily fetch og:image when src is missing. */
  articleUrl?: string;
  sourceId?: string;
  sourceName?: string;
  className?: string;
  variant?: "card" | "detail" | "reader";
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
  ["#2dd4bf", "#0d9488"],
  ["#38bdf8", "#0284c7"],
  ["#a78bfa", "#7c3aed"],
  ["#f7931a", "#b45309"],
  ["#f472b6", "#be185d"],
  ["#2dd4bf", "#0e7490"],
  ["#34d399", "#047857"],
  ["#60a5fa", "#1e40af"],
  ["#fbbf24", "#92400e"],
  ["#c084fc", "#6d28d9"],
];

/** Pick a different icon per category for the placeholder. */
const CATEGORY_ICONS = {
  crypto: Bitcoin,
  ai: Brain,
  tech: Cpu,
  gaming: Gamepad2,
  entertainment: Film,
  space: Rocket,
} as const;

export function SmartImage({
  src,
  alt,
  category,
  articleUrl,
  sourceId = "",
  sourceName = "",
  className,
  variant = "card",
  aspectClass = "aspect-[16/9]",
  loading = "lazy",
}: SmartImageProps) {
  const [imgError, setImgError] = useState(false);
  const [fetchedImage, setFetchedImage] = useState<string | undefined>(undefined);
  const [fetchingOG, setFetchingOG] = useState(false);
  const [ogFailed, setOGFailed] = useState(false);
  const { lang } = useLanguage();

  const gradient = useMemo(() => {
    const seed = hashString(sourceId + sourceName + category);
    return GRADIENTS[seed % GRADIENTS.length];
  }, [sourceId, sourceName, category]);

  const Icon = CATEGORY_ICONS[category] || Sparkles;

  // Use a ref to track the current articleUrl so we don't re-fetch on every render
  const fetchRef = useRef<string | null>(null);
  // Ref to the container element, used for IntersectionObserver
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Track whether the card has entered the viewport at least once
  const [isVisible, setIsVisible] = useState(false);

  // IntersectionObserver — defer og:image fetch until card is near viewport
  useEffect(() => {
    if (isVisible) return; // already visible once, no need to re-observe
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      // SSR or old browser fallback — just mark visible
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        // Start fetching when card is within 500px of viewport (~8 cards ahead)
        rootMargin: "500px 0px",
        threshold: 0,
      }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  // If src is missing but articleUrl is provided, lazily fetch og:image
  // BUT only after the card has entered the viewport (IntersectionObserver)
  useEffect(() => {
    if (src && !imgError) return;
    if (!articleUrl) return;
    if (!isVisible) return; // wait until in view
    if (fetchRef.current === articleUrl) return;
    fetchRef.current = articleUrl;

    let cancelled = false;
    setFetchingOG(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/og-image?url=${encodeURIComponent(articleUrl)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.url) {
          setFetchedImage(data.url);
          setOGFailed(false);
        } else {
          setOGFailed(true);
        }
      } catch {
        if (!cancelled) setOGFailed(true);
      } finally {
        if (!cancelled) setFetchingOG(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, articleUrl, imgError, isVisible]);

  // Reset state when articleUrl or src changes
  useEffect(() => {
    setFetchedImage(undefined);
    setOGFailed(false);
    setImgError(false);
    fetchRef.current = null;
  }, [articleUrl, src]);

  const effectiveSrc = src || fetchedImage;
  const showPlaceholder =
    (!effectiveSrc || imgError) && (!articleUrl || ogFailed || (!fetchingOG && !fetchedImage));

  // Show real image (from RSS or fetched og:image)
  if (effectiveSrc && !imgError) {
    return (
      <div ref={containerRef} className={cn("relative overflow-hidden", aspectClass, className)}>
        <img
          src={effectiveSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading={loading}
        />
      </div>
    );
  }

  // Show "fetching" state briefly if we're trying to get og:image
  if (!src && articleUrl && fetchingOG && !showPlaceholder) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden flex items-center justify-center",
          aspectClass,
          className
        )}
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}1a 0%, ${gradient[1]}1a 60%, transparent 100%)`,
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-muted)] opacity-50" />
      </div>
    );
  }

  // LAST RESORT — beautiful placeholder
  // (only shown when RSS image is missing AND og:image fetch failed/not available)
  return (
    <Placeholder
      gradient={gradient}
      Icon={Icon}
      category={category}
      variant={variant}
      sourceName={sourceName}
      lang={lang}
      aspectClass={aspectClass}
      className={className}
      containerRef={containerRef}
    />
  );
}

function Placeholder({
  gradient,
  Icon,
  category,
  variant,
  sourceName,
  lang,
  aspectClass,
  className,
  containerRef,
}: {
  gradient: string[];
  Icon: React.ComponentType<{ className?: string }>;
  category: Exclude<Category, "all">;
  variant: "card" | "detail" | "reader";
  sourceName: string;
  lang: "fa" | "en";
  aspectClass: string;
  className?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const meta = CATEGORY_META[category];
  const label = categoryLabel(category, lang);

  // Generate a unique pattern based on category — abstract shapes, not just a letter
  const patternSeed = hashString(category + sourceName);
  const patternType = patternSeed % 4;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden flex items-center justify-center",
        aspectClass,
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}26 0%, ${gradient[1]}33 50%, transparent 100%)`,
      }}
    >
      {/* Layered radial gradients — abstract depth */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at ${20 + (patternSeed % 30)}% ${30 + (patternSeed % 40)}%, ${gradient[0]}30 0%, transparent 35%),
            radial-gradient(circle at ${70 + (patternSeed % 20)}% ${60 + (patternSeed % 30)}%, ${gradient[1]}30 0%, transparent 35%),
            radial-gradient(circle at ${40 + (patternSeed % 40)}% ${85 + (patternSeed % 10)}%, ${gradient[0]}15 0%, transparent 25%)
          `,
        }}
      />

      {/* Decorative pattern overlay — varies by seed */}
      {patternType === 0 && (
        // Diagonal lines
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${gradient[0]} 0, ${gradient[0]} 1px, transparent 1px, transparent 12px)`,
          }}
        />
      )}
      {patternType === 1 && (
        // Dotted grid
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(${gradient[0]}40 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }}
        />
      )}
      {patternType === 2 && (
        // Concentric circles
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, transparent 20%, ${gradient[0]}20 20%, transparent 22%, transparent 35%, ${gradient[0]}15 35%, transparent 37%, transparent 50%, ${gradient[0]}10 50%, transparent 52%)`,
          }}
        />
      )}
      {patternType === 3 && (
        // Wave-like gradient
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `conic-gradient(from ${patternSeed % 360}deg at 50% 50%, ${gradient[0]}00, ${gradient[0]}40, ${gradient[1]}40, ${gradient[0]}00)`,
          }}
        />
      )}

      {/* Center content — icon + category label, not just a letter */}
      <div className="relative flex flex-col items-center gap-2 px-4">
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm"
          style={{
            background: `linear-gradient(135deg, ${gradient[0]}30, ${gradient[1]}30)`,
            border: `1px solid ${gradient[0]}40`,
            boxShadow: `0 0 24px ${gradient[0]}30`,
          }}
        >
          <Icon
            className="w-5 h-5 md:w-6 md:h-6"
            // @ts-expect-error — inline style
            style={{ color: gradient[0] }}
          />
        </div>

        <div className="text-center">
          <div
            className="text-xs md:text-sm font-bold tracking-wide"
            style={{ color: gradient[0] }}
          >
            {label}
          </div>
          {variant !== "card" && sourceName && (
            <div className="text-[10px] md:text-xs text-[var(--brand-muted)] mt-1 max-w-[200px] truncate">
              {sourceName}
            </div>
          )}
        </div>
      </div>

      {/* Tiny corner indicator */}
      <div className="absolute bottom-2 right-2 opacity-30">
        <Network className="w-3 h-3 text-[var(--brand-muted)]" />
      </div>
    </div>
  );
}
