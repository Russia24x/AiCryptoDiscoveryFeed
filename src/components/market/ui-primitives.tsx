"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modern UI primitives for the Market Intelligence portal.
 *
 * Design language:
 *  - Glassmorphism (frosted glass effect with backdrop-blur)
 *  - Subtle gradients with accent color
 *  - Hover lift + glow effects
 *  - Smooth transitions
 *  - Consistent border-radius and shadows
 *
 * These primitives are used across the market pages to keep a cohesive
 * visual language without duplicating className strings everywhere.
 */

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Adds a subtle gradient glow on hover. */
  glow?: boolean;
  /** Adds a colored top border accent. */
  accent?: string;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  glow = false,
  accent,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border border-[var(--brand-border)]",
        "bg-[var(--brand-surface)]/80 backdrop-blur-md",
        "transition-all duration-300",
        glow &&
          "hover:border-[var(--brand-accent)]/40 hover:shadow-xl hover:shadow-[var(--brand-accent)]/5 hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className
      )}
      style={accent ? { borderTopColor: accent, borderTopWidth: "2px" } : undefined}
    >
      {children}
    </div>
  );
}

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
    <GlassCard glow className={cn("p-3 md:p-4 overflow-hidden", className)}>
      {/* Background gradient glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ backgroundColor: accent }}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1">
          {icon && (
            <div
              className="w-3.5 h-3.5 flex items-center justify-center"
              style={{ color: accent }}
            >
              {icon}
            </div>
          )}
          <span className="text-[10px] md:text-[11px] font-latin uppercase tracking-wider text-[var(--brand-muted)] truncate">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base md:text-lg font-bold text-[var(--brand-text)] font-latin">
            {value}
          </span>
          {change != null && (
            <span
              className={cn(
                "text-[10px] md:text-xs font-latin font-bold",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/**
 * Mini sparkline chart — tiny inline line chart for price trends.
 * Renders as inline SVG with a gradient area fill.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "var(--brand-accent)",
  className,
}: SparklineProps) {
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
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ProgressBarProps {
  value: number; // 0-100
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
    <div
      className={cn("h-1.5 rounded-full overflow-hidden", className)}
      style={{ backgroundColor: trackColor }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default:
      "bg-[var(--brand-surface-2)] text-[var(--brand-muted)] border-[var(--brand-border)]",
    success:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning:
      "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger: "bg-red-500/10 text-red-400 border-red-500/30",
    accent:
      "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] border-[var(--brand-accent)]/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
