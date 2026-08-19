"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * UI primitives for the Market Intelligence portal.
 *
 * Design language (Phase 22 — simplified for performance):
 *  - NO glassmorphism (removed backdrop-blur — it's GPU-intensive)
 *  - NO gradient glows (removed blur-3xl divs — they paint large areas)
 *  - Solid backgrounds with subtle borders
 *  - Hover: simple border color change (no transforms, no shadows)
 *  - Minimal transitions (color only, not transform)
 *
 * This keeps the UI modern and clean while being lightweight on CPU/GPU.
 */

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: string;
  onClick?: () => void;
}

/** Simple bordered card — no blur, no glow. */
export function Card({ children, className, accent, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]",
        onClick && "cursor-pointer",
        className
      )}
      style={accent ? { borderTopColor: accent, borderTopWidth: "2px" } : undefined}
    >
      {children}
    </div>
  );
}

// Keep GlassCard as an alias for backwards compatibility (now just a plain Card)
export const GlassCard = Card;

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  icon?: ReactNode;
  accent?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  accent = "var(--brand-accent)",
  className,
}: StatCardProps) {
  const isPositive = change != null && change >= 0;
  return (
    <div className={cn("p-3 md:p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]", className)}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && (
          <div className="w-3.5 h-3.5 flex items-center justify-center" style={{ color: accent }}>
            {icon}
          </div>
        )}
        <span className="text-[10px] md:text-[11px] font-latin uppercase tracking-wider text-[var(--brand-muted)] truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-base md:text-lg font-bold text-[var(--brand-text)] font-latin tabular-nums">
          {value}
        </span>
        {change != null && (
          <span className={cn("text-[10px] md:text-xs font-latin font-bold", isPositive ? "text-emerald-400" : "text-red-400")}>
            {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/** Minimal sparkline — no gradient fill (just a line). */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "var(--brand-accent)",
  className,
}: MiniSparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className={className} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  className?: string;
}

export function ProgressBar({
  value,
  color = "var(--brand-accent)",
  trackColor = "var(--brand-surface-2)",
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 rounded-full overflow-hidden", className)} style={{ backgroundColor: trackColor }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-[var(--brand-surface-2)] text-[var(--brand-muted)] border-[var(--brand-border)]",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger: "bg-red-500/10 text-red-400 border-red-500/30",
    accent: "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] border-[var(--brand-accent)]/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border", variants[variant], className)}>
      {children}
    </span>
  );
}
