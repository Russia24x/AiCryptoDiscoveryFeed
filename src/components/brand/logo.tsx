"use client";

import { cn } from "@/lib/utils";
import type { Language } from "@/lib/sources";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSub?: boolean;
  lang?: Language;
  /**
   * Logo variant — controls which words are shown.
   * - "full" (default): "Ai Crypto Discovery" — used on /crypto and the crypto sub-pages
   * - "discovery": "Ai Discovery" — used on the home hub (no specific category)
   * - "ai": "Ai" — minimal, just the "Ai" word
   */
  variant?: "full" | "discovery" | "ai";
}

export function Logo({
  className,
  size = "md",
  showSub = false,
  lang = "fa",
  variant = "full",
}: LogoProps) {
  const sizes = {
    sm: { ai: "text-base", crypto: "text-base", discovery: "text-base", sub: "text-[10px]" },
    md: { ai: "text-xl", crypto: "text-xl", discovery: "text-xl", sub: "text-xs" },
    lg: { ai: "text-3xl md:text-4xl", crypto: "text-3xl md:text-4xl", discovery: "text-3xl md:text-4xl", sub: "text-sm" },
  } as const;

  const s = sizes[size];

  return (
    <div className={cn("flex flex-col items-start leading-none", className)}>
      <div className="flex items-baseline gap-1.5 font-extrabold tracking-tight font-display">
        <span className={cn("text-[var(--brand-text)]", s.ai)}>Ai</span>
        {variant === "full" && (
          <span className={cn("text-[var(--brand-text)]", s.crypto)}>Crypto</span>
        )}
        <span className={cn("text-[var(--brand-accent)]", s.discovery)}>Discovery</span>
      </div>
      {showSub && (
        <span className={cn("mt-1 text-[var(--brand-muted)] font-latin tracking-[0.2em] uppercase", s.sub)}>
          {lang === "fa" ? "آینده · داده · هوشمندی" : "Future · Data · Intelligence"}
        </span>
      )}
    </div>
  );
}
