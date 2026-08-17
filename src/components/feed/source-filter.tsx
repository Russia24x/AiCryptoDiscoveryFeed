"use client";

import { Filter, X, Check } from "lucide-react";
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
 */
export function SourceFilter({
  category,
  activeSourceId,
  onSourceChange,
}: SourceFilterProps) {
  const { t, lang } = useLanguage();

  // Filter sources by BOTH category AND current UI language
  const sources = SOURCES.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (s.language !== lang) return false;
    return true;
  });

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
            className="text-[11px] text-[var(--brand-accent)] hover:underline flex items-center gap-1 ml-2"
          >
            <X className="w-3 h-3" />
            {t.feed.clearFilter}
          </button>
        )}
      </div>

      {/* Scrolling pill strip */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
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
  );
}
