"use client";

import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { SOURCES, CATEGORY_META } from "@/lib/sources";
import { cn } from "@/lib/utils";

interface SourceFilterProps {
  category: string;
  activeSourceId: string | null;
  onSourceChange: (sourceId: string | null) => void;
}

export function SourceFilter({
  category,
  activeSourceId,
  onSourceChange,
}: SourceFilterProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on small screens
  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sources =
    category === "all"
      ? SOURCES
      : SOURCES.filter((s) => s.category === category);

  if (sources.length === 0) return null;

  return (
    <div className="mb-4 -mt-2">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-3.5 h-3.5 text-[var(--brand-muted)]" />
        <span className="text-[11px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
          Source Filter
        </span>
        {activeSourceId && (
          <button
            onClick={() => onSourceChange(null)}
            className="text-[11px] text-[var(--brand-accent)] hover:underline flex items-center gap-1 mr-auto"
          >
            <X className="w-3 h-3" />
            حذف فیلتر
          </button>
        )}
      </div>

      {/* Scrolling chip strip */}
      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-1 -mx-1 px-1",
          "[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1"
        )}
      >
        <button
          onClick={() => onSourceChange(null)}
          className={cn(
            "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
            activeSourceId === null
              ? "bg-[var(--brand-accent)] text-[#04201d]"
              : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40"
          )}
        >
          همه منابع
        </button>

        {sources.map((src) => {
          const meta = CATEGORY_META[src.category];
          const active = activeSourceId === src.id;
          return (
            <button
              key={src.id}
              onClick={() => onSourceChange(active ? null : src.id)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                active
                  ? "bg-[var(--brand-accent)] text-[#04201d] font-bold"
                  : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40"
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: active ? "#04201d" : meta?.tint,
                }}
              />
              {src.name}
            </button>
          );
        })}
      </div>

      {/* Collapse hint on small screens */}
      {collapsed && sources.length > 8 && (
        <p className="mt-1.5 text-[10px] text-[var(--brand-muted)]">
          → برای دیدن همه منابع بکشید
        </p>
      )}
    </div>
  );
}
