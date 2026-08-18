"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Bitcoin,
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
  source?: string;
  cached?: boolean;
  fetchedAt?: string;
}

interface FngData {
  value: number;
  classification: string;
  yesterday?: number;
  lastWeek?: number;
  fetchedAt?: string;
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
              className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight"
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

            {/* Quick-jump CTA buttons — modern, button-style */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="flex flex-wrap gap-2 mt-2"
            >
              <CtaButton
                href="#feed"
                label={lang === "fa" ? "مشاهده فید زنده" : "Live feed"}
                accent="var(--brand-accent)"
                primary
              />
              <CtaButton
                href="#channels"
                label={lang === "fa" ? "شبکه‌های اجتماعی" : "Social feeds"}
                accent="#38bdf8"
              />
              <CtaButton
                href="#vision"
                label={lang === "fa" ? "محورهای آینده" : "Future pillars"}
                accent="#a78bfa"
              />
              {onOpenSettings && (
                <CtaButton
                  onClick={onOpenSettings}
                  label={lang === "fa" ? "تنظیمات" : "Settings"}
                  accent="#f59e0b"
                  icon={<SettingsIcon className="w-3.5 h-3.5" />}
                />
              )}
            </motion.div>
          </div>

          {/* RIGHT — live widgets grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid grid-cols-2 gap-3 md:gap-4"
          >
            <BtcWidget />
            <TetherWidget />
            <FearGreedWidget />
            <WeatherWidget onOpenSettings={onOpenSettings} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Modern CTA button with subtle shimmer. */
function CtaButton({
  href,
  onClick,
  label,
  accent,
  primary,
  icon,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  accent: string;
  primary?: boolean;
  icon?: React.ReactNode;
}) {
  const inner = (
    <span
      className={cn(
        "group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all overflow-hidden",
        primary
          ? "text-[#04201d] hover:brightness-110"
          : "border text-[var(--brand-text)] hover:bg-[var(--brand-surface)]"
      )}
      style={
        primary
          ? { background: accent }
          : { borderColor: `${accent}40` }
      }
    >
      {/* Shimmer sweep on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      {icon && <span className="relative">{icon}</span>}
      <span className="relative">{label}</span>
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
  const [data, setData] = useState<BtcData | null>(null);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef<number | undefined>(undefined);

  // Fetch real-time BTC price from Binance via our edge-cached API.
  // Binance ticker updates every 1s; we refresh every 10s for a good
  // balance of freshness vs edge-cache hit rate.
  useEffect(() => {
    let cancelled = false;
    let id: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const res = await fetch("/api/market/binance-ticker", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        // Find BTC in the response
        const btc = json?.coins?.find((c: { symbol: string }) => c.symbol === "BTC");
        if (btc && typeof btc.price === "number") {
          prevRef.current = data?.price;
          setData({
            price: btc.price,
            change24h: btc.change24h,
            high24h: btc.high24h,
            low24h: btc.low24h,
          });
        }
      } catch {
        // ignore — keep stale price
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Refresh every 10s — Binance ticker is real-time so this gives the
    // "live" feeling the user requested.
    id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const up = (data?.change24h ?? 0) >= 0;
  const flash =
    prevRef.current !== undefined && data?.price !== undefined
      ? data.price > prevRef.current
        ? "ticker-flash-up"
        : data.price < prevRef.current
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
      {loading ? (
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
  const [data, setData] = useState<TetherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let id: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const res = await fetch("/api/market/iran-tether", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json?.price) {
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const change = data?.change24h;
  const up = (change ?? 0) >= 0;

  return (
    <WidgetCard
      title={lang === "fa" ? "تتر / تومان" : "USDT / Toman"}
      icon={<span className="text-[10px] font-bold font-latin">₮</span>}
      accent="#26a17b"
    >
      {loading ? (
        <SkeletonRow />
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

/* ============= Fear & Greed widget ============= */
function FearGreedWidget() {
  const { lang } = useLanguage();
  const [data, setData] = useState<FngData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let id: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const res = await fetch("/api/market/fear-greed", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json?.value !== undefined) {
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    id = setInterval(load, 5 * 60_000); // every 5 min — F&G updates hourly upstream
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <WidgetCard
      title={lang === "fa" ? "شاخص ترس و طمع" : "Fear & Greed"}
      icon={<Thermometer className="w-3.5 h-3.5" />}
      accent="#a78bfa"
    >
      {loading ? (
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
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Fetch weather whenever city changes
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    let id: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const url = `/api/weather?lat=${city.lat}&lon=${city.lon}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json?.temperature !== undefined) setData(json);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    id = setInterval(load, 10 * 60_000); // 10 min refresh
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [city, hydrated]);

  return (
    <WidgetCard
      title={lang === "fa" ? city.nameFa : city.nameEn}
      icon={<Cloud className="w-3.5 h-3.5" />}
      accent="#38bdf8"
      onHeaderClick={onOpenSettings}
      headerTitle={lang === "fa" ? "تغییر شهر" : "Change city"}
    >
      {loading ? (
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
