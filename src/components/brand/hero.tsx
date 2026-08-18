"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Bitcoin,
  Brain,
  Cpu,
  Gamepad2,
  Film,
  Telescope,
  Activity,
  Send,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Cloud,
  Wind,
  Droplets,
  Eye,
  Settings as SettingsIcon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { formatNumber } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";

interface HeroProps {
  totalItems: number;
  sourcesOk: number;
  sourcesTried: number;
  onOpenSettings?: () => void;
}

interface BtcData {
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
}

interface TetherData {
  price: number;        // Toman per USDT
  change24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  quoteVolume24h?: number;
  bidPrice?: number;
  askPrice?: number;
  source?: string;
  cached?: boolean;
  fetchedAt?: string;
  /** Set when Iranian exchange APIs are unreachable from the server. */
  unavailable?: boolean;
}

interface FngData {
  value: number;
  classification: string;
  yesterday?: number;
  lastWeek?: number;
  fetchedAt?: string;
}

interface Sp500Data {
  symbol: string;
  name: string;
  price: number;
  change24h: number;       // percent
  changeAbs: number;       // points
  high24h: number;
  low24h: number;
  previousClose: number;
  source?: string;
  fetchedAt?: string;
  cached?: boolean;
  unavailable?: boolean;
  marketClosed?: boolean;
}

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  descriptionFa: string;
  emoji: string;
  isDay: boolean;
  fetchedAt?: string;
}

/** Format Toman price with thousand separators (Persian digits in FA mode). */
function formatToman(price: number, lang: "fa" | "en"): string {
  // Persian digits
  const s = Math.round(price).toLocaleString("en-US");
  return lang === "fa" ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
}

/** Format BTC price with thousand separators. */
function formatUsd(price: number, lang: "fa" | "en"): string {
  const s = price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return lang === "fa" ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
}

/** Format a number with Persian digits in FA mode (no separators). */
function formatFa(n: number | string, lang: "fa" | "en"): string {
  const s = String(n);
  return lang === "fa" ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
}

/**
 * Returns a font class that's appropriate for the current language.
 *
 * - In LTR/EN mode: use `font-latin` (Inter) for crisp Latin digits.
 * - In RTL/FA mode: use `font-sans` (Vazirmatn) so Persian digits render
 *   with the proper Persian font (Inter doesn't have Persian digit glyphs
 *   in its tabular-nums set, so it falls back to system fonts which look
 *   inconsistent on Windows/Linux).
 *
 * Apply this to any container that shows numbers in the widgets.
 */
function numFontClass(lang: "fa" | "en"): string {
  return lang === "fa" ? "font-sans" : "font-latin";
}

/** Map F&G value to color. */
function fngColor(value: number): string {
  if (value <= 24) return "#ef4444"; // red
  if (value <= 44) return "#f97316"; // orange
  if (value <= 55) return "#eab308"; // yellow
  if (value <= 75) return "#84cc16"; // lime
  return "#22c55e"; // green
}

/** Map F&G value to emoji. */
function fngEmoji(value: number): string {
  if (value <= 24) return "😨";
  if (value <= 44) return "😟";
  if (value <= 55) return "😐";
  if (value <= 75) return "🙂";
  return "🤩";
}

export function Hero({ totalItems, sourcesOk, sourcesTried, onOpenSettings }: HeroProps) {
  const { t, lang, isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden border-b border-[var(--brand-border)]">
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] bg-glow-teal pointer-events-none" />
      <div
        className="absolute top-1/3 -left-24 w-[300px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.10), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-32 -right-24 w-[420px] h-[420px] pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(167,139,250,0.08), transparent 70%)",
        }}
      />

      {/* Floating decorative dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="absolute top-12 right-[8%] w-1 h-1 rounded-full bg-[var(--brand-accent)]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.2, delay: 0.6 }}
        className="absolute top-32 left-[12%] w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,440px)] gap-8 lg:gap-12 items-start">
          {/* LEFT — headline + CTA buttons */}
          <div className="flex flex-col items-start gap-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/20 text-xs font-latin tracking-wide text-[var(--brand-accent)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="uppercase tracking-[0.2em]">{t.hero.badge}</span>
              <span className="relative ml-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-accent)]" />
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight"
            >
              <span className="text-[var(--brand-text)]">{t.hero.titlePart1}</span>
              <span className="text-[var(--brand-accent)]">{t.hero.titleAccent}</span>
              <span className="text-[var(--brand-text)]">{t.hero.titlePart2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-base md:text-lg text-[var(--brand-muted)] max-w-2xl leading-relaxed"
            >
              {t.hero.description}
            </motion.p>

            {/* Tab-style graphical CTA buttons — modern, icon + label.
                Clicking navigates to the category page (for category tabs)
                or scrolls to section (for in-page tabs). */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="flex flex-wrap gap-1.5 mt-2 p-1.5 rounded-2xl bg-[var(--brand-surface)]/60 backdrop-blur-sm border border-[var(--brand-border)]"
            >
              <HeroTab
                href="#feed"
                label={lang === "fa" ? "فید زنده" : "Live Feed"}
                icon={<Activity className="w-3.5 h-3.5" />}
                accent="#2dd4bf"
                primary
              />
              <HeroTab
                href="#channels"
                label={lang === "fa" ? "شبکه‌ها" : "Social"}
                icon={<Send className="w-3.5 h-3.5" />}
                accent="#38bdf8"
              />
              <HeroTab
                href="#vision"
                label={lang === "fa" ? "آینده" : "Future"}
                icon={<Telescope className="w-3.5 h-3.5" />}
                accent="#a78bfa"
              />
              <HeroTab
                href="/crypto"
                label={lang === "fa" ? "کریپتو" : "Crypto"}
                icon={<Bitcoin className="w-3.5 h-3.5" />}
                accent="#f7931a"
              />
              <HeroTab
                href="/ai"
                label={lang === "fa" ? "هوش مصنوعی" : "AI"}
                icon={<Brain className="w-3.5 h-3.5" />}
                accent="#2dd4bf"
              />
              <HeroTab
                href="/tech"
                label={lang === "fa" ? "فناوری" : "Tech"}
                icon={<Cpu className="w-3.5 h-3.5" />}
                accent="#38bdf8"
              />
              <HeroTab
                href="/gaming"
                label={lang === "fa" ? "بازی" : "Gaming"}
                icon={<Gamepad2 className="w-3.5 h-3.5" />}
                accent="#a78bfa"
              />
              <HeroTab
                href="/entertainment"
                label={lang === "fa" ? "سرگرمی" : "Entertainment"}
                icon={<Film className="w-3.5 h-3.5" />}
                accent="#f472b6"
              />
              {onOpenSettings && (
                <HeroTab
                  onClick={onOpenSettings}
                  label={lang === "fa" ? "تنظیمات" : "Settings"}
                  icon={<SettingsIcon className="w-3.5 h-3.5" />}
                  accent="#f59e0b"
                />
              )}
            </motion.div>
          </div>

          {/* RIGHT — live widgets grid.
              In FA mode: BTC | Tether | Fear&Greed | Weather
              In EN mode: BTC | S&P 500 | Fear&Greed | Weather
              (Tether/Toman is only relevant to Iranian users; for English
              users we show the S&P 500 index instead.) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid grid-cols-2 gap-3 md:gap-4"
          >
            <BtcWidget />
            {lang === "fa" ? <TetherWidget /> : <Sp500Widget />}
            <FearGreedWidget />
            <WeatherWidget onOpenSettings={onOpenSettings} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Modern CTA button with subtle shimmer. */
/**
 * HeroTab — a modern graphical tab button for the hero CTA bar.
 *
 * Visual design:
 *   - Pill shape with icon + label
 *   - Default state: subtle border + surface bg, accent icon
 *   - Primary (active) state: filled with accent color, dark text
 *   - Hover: lifts slightly, accent border brightens
 *   - Shimmer sweep on hover (like CtaButton had)
 *
 * Used for both:
 *   - In-page navigation (href="#feed", href="#channels")
 *   - Cross-page navigation (href="/crypto", href="/ai")
 *   - Action triggers (onClick for settings)
 */
function HeroTab({
  href,
  onClick,
  label,
  icon,
  accent,
  primary,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  accent: string;
  primary?: boolean;
}) {
  const inner = (
    <span
      className={cn(
        "group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-all overflow-hidden",
        primary
          ? "text-[#04201d] hover:brightness-110 shadow-md"
          : "border text-[var(--brand-text)] hover:bg-[var(--brand-surface)] hover:border-[var(--brand-accent)]/40"
      )}
      style={
        primary
          ? { background: accent, boxShadow: `0 2px 12px ${accent}40` }
          : { borderColor: `${accent}40` }
      }
    >
      {/* Shimmer sweep on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <span className="relative shrink-0" style={{ color: primary ? "#04201d" : accent }}>
        {icon}
      </span>
      <span className="relative whitespace-nowrap">{label}</span>
    </span>
  );
  if (href) {
    return (
      <a href={href} aria-label={label}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} aria-label={label}>
      {inner}
    </button>
  );
}

/* ============= BTC widget ============= */
function BtcWidget() {
  const { lang } = useLanguage();
  const prevRef = useRef<number | undefined>(undefined);

  // Real-time BTC price from Binance (with Coinbase + CoinGecko fallbacks
  // configured in the API route). Refreshes every 10s via TanStack Query's
  // refetchInterval — automatically paused when the tab is hidden and
  // resumed when visible (refetchOnWindowFocus is set globally).
  const { data, isLoading } = useQuery({
    queryKey: ["market", "binance-ticker", "BTC"],
    queryFn: async () => {
      const res = await fetch("/api/market/binance-ticker", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const btc = json?.coins?.find((c: { symbol: string }) => c.symbol === "BTC");
      if (!btc || typeof btc.price !== "number") {
        throw new Error("BTC not found in ticker response");
      }
      return {
        price: btc.price as number,
        change24h: btc.change24h as number,
        high24h: btc.high24h as number | undefined,
        low24h: btc.low24h as number | undefined,
      };
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
    select: (data) => {
      // Track previous price for the flash animation
      const prev = prevRef.current;
      prevRef.current = data.price;
      return { ...data, prev };
    },
  });

  const up = (data?.change24h ?? 0) >= 0;
  const flash =
    data?.prev !== undefined && data?.price !== undefined
      ? data.price > data.prev
        ? "ticker-flash-up"
        : data.price < data.prev
        ? "ticker-flash-down"
        : ""
      : "";

  return (
    <WidgetCard
      title={lang === "fa" ? "بیت‌کوین" : "Bitcoin"}
      icon={<Bitcoin className="w-3.5 h-3.5" />}
      accent="#f7931a"
      className={flash}
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data ? (
        <>
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
            ${formatUsd(data.price, lang)}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold mt-1",
              numFontClass(lang),
              up ? "text-[var(--brand-accent)]" : "text-red-400"
            )}
          >
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatFa(Math.abs(data.change24h).toFixed(2), lang)}% <span className="opacity-60">24h</span>
          </div>
          {/* 24h high/low row — only show if both are available */}
          {data.high24h !== undefined && data.low24h !== undefined && (
            <div className={cn("flex items-center justify-between text-[9px] text-[var(--brand-muted)]/80 mt-1.5 pt-1.5 border-t border-[var(--brand-border)]/50", numFontClass(lang))}>
              <span className="flex items-center gap-1">
                <span className="opacity-60">{lang === "fa" ? "بالا:" : "H:"}</span>
                <span className="text-[var(--brand-accent)]/80">${formatUsd(data.high24h, lang)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="opacity-60">{lang === "fa" ? "پایین:" : "L:"}</span>
                <span className="text-red-400/80">${formatUsd(data.low24h, lang)}</span>
              </span>
            </div>
          )}
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Tether widget ============= */
function TetherWidget() {
  const { lang } = useLanguage();

  // Tether/Toman price from Wallex (with Nobitex fallback). Refreshes every
  // 30s. Returns `unavailable: true` when Iranian exchanges are unreachable
  // (e.g., from Cloudflare US PoPs) — the UI shows "ناموجود" in that case.
  const { data, isLoading } = useQuery<TetherData>({
    queryKey: ["market", "iran-tether"],
    queryFn: async () => {
      const res = await fetch("/api/market/iran-tether", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as TetherData;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const change = data?.change24h;
  const up = (change ?? 0) >= 0;

  return (
    <WidgetCard
      title={lang === "fa" ? "تتر / تومان" : "USDT / Toman"}
      icon={<span className="text-[10px] font-bold font-latin">₮</span>}
      accent="#26a17b"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data?.unavailable ? (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--brand-muted)]">
          <AlertCircle className="w-3 h-3" />
          <span>{lang === "fa" ? "ناموجود" : "Unavailable"}</span>
        </div>
      ) : data ? (
        <>
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
            {formatToman(data.price, lang)}
          </div>
          <div className={cn("flex items-center gap-1 text-[10px] text-[var(--brand-muted)] mt-1", numFontClass(lang))}>
            <span>{lang === "fa" ? "تومان" : "Toman"}</span>
            {data.cached && <span className="opacity-60">· cached</span>}
            {change !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-0.5 ml-1 font-semibold",
                  up ? "text-[var(--brand-accent)]" : "text-red-400"
                )}
              >
                {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {formatFa(Math.abs(change).toFixed(2), lang)}%
              </span>
            )}
          </div>
          {/* 24h high/low row — only show if both are available */}
          {data.high24h !== undefined && data.low24h !== undefined && (
            <div className={cn("flex items-center justify-between text-[9px] text-[var(--brand-muted)]/80 mt-1.5 pt-1.5 border-t border-[var(--brand-border)]/50", numFontClass(lang))}>
              <span className="flex items-center gap-1">
                <span className="opacity-60">{lang === "fa" ? "بالا:" : "H:"}</span>
                <span className="text-[var(--brand-accent)]/80">{formatToman(data.high24h, lang)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="opacity-60">{lang === "fa" ? "پایین:" : "L:"}</span>
                <span className="text-red-400/80">{formatToman(data.low24h, lang)}</span>
              </span>
            </div>
          )}
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= S&P 500 widget (English mode only — replaces Tether/Toman) ============= */
function Sp500Widget() {
  const { lang } = useLanguage();

  // S&P 500 index from Yahoo Finance. Refreshes every 60s — Yahoo data
  // doesn't change faster than that during market hours.
  const { data, isLoading } = useQuery<Sp500Data>({
    queryKey: ["market", "sp500"],
    queryFn: async () => {
      const res = await fetch("/api/market/sp500", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Sp500Data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const change = data?.change24h;
  const up = (change ?? 0) >= 0;

  return (
    <WidgetCard
      title="S&P 500"
      icon={<span className="text-[10px] font-bold font-latin">$</span>}
      accent="#10b981"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data?.unavailable ? (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--brand-muted)]">
          <AlertCircle className="w-3 h-3" />
          <span>Market data unavailable</span>
        </div>
      ) : data ? (
        <>
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
            {formatUsd(data.price, lang)}
          </div>
          <div className={cn("flex items-center gap-1 text-[10px] text-[var(--brand-muted)] mt-1", numFontClass(lang))}>
            <span>USD</span>
            {data.cached && <span className="opacity-60">· cached</span>}
            {data.marketClosed && (
              <span className="opacity-60">· closed</span>
            )}
            {change !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-0.5 ml-1 font-semibold",
                  up ? "text-[var(--brand-accent)]" : "text-red-400"
                )}
              >
                {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {formatFa(Math.abs(change).toFixed(2), lang)}%
                <span className="opacity-60 ml-1">
                  ({up ? "+" : "-"}{formatFa(Math.abs(data.changeAbs).toFixed(2), lang)})
                </span>
              </span>
            )}
          </div>
          {/* 24h high/low row */}
          {data.high24h !== undefined && data.low24h !== undefined && (
            <div className={cn("flex items-center justify-between text-[9px] text-[var(--brand-muted)]/80 mt-1.5 pt-1.5 border-t border-[var(--brand-border)]/50", numFontClass(lang))}>
              <span className="flex items-center gap-1">
                <span className="opacity-60">H:</span>
                <span className="text-[var(--brand-accent)]/80">{formatUsd(data.high24h, lang)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="opacity-60">L:</span>
                <span className="text-red-400/80">{formatUsd(data.low24h, lang)}</span>
              </span>
            </div>
          )}
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Fear & Greed widget ============= */
function FearGreedWidget() {
  const { lang } = useLanguage();

  // Crypto Fear & Greed Index from alternative.me. Updates hourly upstream,
  // so we refresh every 5 min — plenty fresh.
  const { data, isLoading } = useQuery<FngData>({
    queryKey: ["market", "fear-greed"],
    queryFn: async () => {
      const res = await fetch("/api/market/fear-greed", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.value === undefined) {
        throw new Error("F&G value missing in response");
      }
      return json as FngData;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  return (
    <WidgetCard
      title={lang === "fa" ? "شاخص ترس و طمع" : "Fear & Greed"}
      icon={<Thermometer className="w-3.5 h-3.5" />}
      accent="#a78bfa"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data ? (
        <>
          <div className="flex items-end gap-2">
            <span
              className={cn("text-3xl md:text-4xl font-extrabold tabular-nums", numFontClass(lang))}
              style={{ color: fngColor(data.value) }}
            >
              {formatFa(data.value, lang)}
            </span>
            <span className="text-2xl">{fngEmoji(data.value)}</span>
          </div>
          {/* Gauge bar 0-100 */}
          <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 opacity-30">
            <div
              className="h-full w-1 rounded-full bg-white shadow-lg"
              style={{
                marginLeft: `calc(${data.value}% - 4px)`,
                boxShadow: "0 0 8px rgba(255,255,255,0.6)",
              }}
            />
          </div>
          <div
            className="text-[10px] font-semibold mt-1.5"
            style={{ color: fngColor(data.value) }}
          >
            {data.classification}
            {data.yesterday !== undefined && (
              <span className="text-[var(--brand-muted)] font-normal ml-1">
                · {lang === "fa" ? "دیروز" : "yest"} {formatFa(data.yesterday, lang)}
              </span>
            )}
          </div>
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Weather widget ============= */
const WEATHER_KEY = "acd:weather-city";

interface CityChoice {
  id: string;
  nameFa: string;
  nameEn: string;
  lat: number;
  lon: number;
}

const DEFAULT_CITY: CityChoice = {
  id: "tehran",
  nameFa: "تهران",
  nameEn: "Tehran",
  lat: 35.6892,
  lon: 51.3890,
};

function readCity(): CityChoice {
  if (typeof window === "undefined") return DEFAULT_CITY;
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.lat === "number" && typeof p.lon === "number") {
        return p;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CITY;
}

function WeatherWidget({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { lang } = useLanguage();
  const [city, setCity] = useState<CityChoice>(DEFAULT_CITY);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setCity(readCity());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === WEATHER_KEY) setCity(readCity());
    };
    const onCustom = () => setCity(readCity());
    window.addEventListener("storage", onStorage);
    window.addEventListener("acd:weather-city-changed", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("acd:weather-city-changed", onCustom as EventListener);
    };
  }, []);

  // Fetch weather whenever city changes — TanStack Query automatically
  // refetches when the queryKey changes (i.e., when city.lat/lon change).
  // Also refreshes every 10 min.
  const { data, isLoading } = useQuery<WeatherData>({
    queryKey: ["weather", city.lat, city.lon],
    queryFn: async () => {
      const url = `/api/weather?lat=${city.lat}&lon=${city.lon}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.temperature === undefined) {
        throw new Error("Temperature missing in weather response");
      }
      return json as WeatherData;
    },
    enabled: hydrated, // Don't fetch until we've hydrated city from localStorage
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });

  return (
    <WidgetCard
      title={lang === "fa" ? city.nameFa : city.nameEn}
      icon={<Cloud className="w-3.5 h-3.5" />}
      accent="#38bdf8"
      onHeaderClick={onOpenSettings}
      headerTitle={lang === "fa" ? "تغییر شهر" : "Change city"}
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data ? (
        <>
          <div className="flex items-end gap-2">
            <span className={cn("text-3xl md:text-4xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
              {formatFa(Math.round(data.temperature), lang)}
              <span className="text-base align-top">°</span>
            </span>
            <span className="text-2xl">{data.emoji}</span>
          </div>
          <div className="text-[10px] text-[var(--brand-muted)] mt-1">
            {lang === "fa" ? data.descriptionFa : data.description}
          </div>
          <div className={cn("flex items-center gap-2 mt-1 text-[10px] text-[var(--brand-muted)]", numFontClass(lang))}>
            <span className="flex items-center gap-0.5">
              <Droplets className="w-2.5 h-2.5" />
              {formatFa(data.humidity, lang)}%
            </span>
            <span className="flex items-center gap-0.5">
              <Wind className="w-2.5 h-2.5" />
              {formatFa(Math.round(data.windSpeed), lang)} km/h
            </span>
          </div>
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Shared widget card ============= */
function WidgetCard({
  title,
  icon,
  accent,
  children,
  className,
  onHeaderClick,
  headerTitle,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
  className?: string;
  onHeaderClick?: () => void;
  headerTitle?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]/60 backdrop-blur-sm p-3 md:p-4 overflow-hidden",
        className
      )}
    >
      {/* Accent edge */}
      <div
        className="absolute top-0 right-0 w-px h-full"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
        }}
      />
      {/* Header row */}
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
            <SettingsIcon className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="space-y-2">
      <div className="h-7 w-20 shimmer rounded" />
      <div className="h-3 w-14 shimmer rounded" />
    </div>
  );
}

function FallbackMsg() {
  const { lang } = useLanguage();
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-[var(--brand-muted)]">
      <AlertCircle className="w-3 h-3" />
      <span>{lang === "fa" ? "داده‌ای در دسترس نیست" : "Data unavailable"}</span>
    </div>
  );
}

/* Helper exported for tests if needed */
export { formatToman, formatUsd };
