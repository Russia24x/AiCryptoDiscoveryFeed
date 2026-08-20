"use client";

import { Languages, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface LanguageToggleProps {
  className?: string;
}

/**
 * Pill-style language toggle: shows [FA | EN] with the active option highlighted.
 * Tapping the inactive side switches language.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { lang, setLanguage, hydrated } = useLanguage();

  if (!hydrated) {
    // Render a placeholder to prevent layout shift before hydration
    return (
      <div
        className={cn(
          "flex items-center bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full p-0.5 h-8 w-[78px]",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={cn(
        "flex items-center bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full p-0.5",
        className
      )}
    >
      <button
        role="radio"
        aria-checked={lang === "fa"}
        onClick={() => setLanguage("fa")}
        className={cn(
          "px-2.5 h-7 rounded-full text-xs font-bold transition-all flex items-center gap-1",
          lang === "fa"
            ? "bg-[var(--brand-accent)] text-[#04201d]"
            : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
        )}
      >
        {lang === "fa" && <Check className="w-3 h-3" />}
        FA
      </button>
      <button
        role="radio"
        aria-checked={lang === "en"}
        onClick={() => setLanguage("en")}
        className={cn(
          "px-2.5 h-7 rounded-full text-xs font-bold transition-all flex items-center gap-1",
          lang === "en"
            ? "bg-[var(--brand-accent)] text-[#04201d]"
            : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
        )}
      >
        {lang === "en" && <Check className="w-3 h-3" />}
        EN
      </button>
    </div>
  );
}

/** Compact icon-only variant for tight spaces (e.g., mobile). */
export function LanguageIconButton({ className }: LanguageToggleProps) {
  const { lang, toggle, hydrated } = useLanguage();

  return (
    <button
      onClick={toggle}
      aria-label={lang === "fa" ? "Switch to English" : "تغییر به فارسی"}
      title={lang === "fa" ? "Switch to English" : "تغییر به فارسی"}
      className={cn(
        "p-2 rounded-full hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors relative",
        className
      )}
    >
      <Languages className="w-4 h-4" />
      {hydrated && (
        <span
          className="absolute -bottom-0.5 -end-0.5 text-[9px] font-bold font-latin bg-[var(--brand-accent)] text-[#04201d] rounded px-0.5 leading-tight"
          suppressHydrationWarning
        >
          {lang.toUpperCase()}
        </span>
      )}
    </button>
  );
}
