"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  Rocket,
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
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useMounted } from "@/hooks/use-mounted";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCryptoPrice } from "@/hooks/use-crypto-price";
import { useTetherPrice } from "@/hooks/use-tether-price";
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

// TetherData and Sp500Data interfaces removed — those API routes were deleted
// because the upstream APIs (Wallex/Nobitex/Yahoo Finance) were either
// geoblocked from Cloudflare Workers or too slow. The widgets now show a
// static informational link instead of fetching live data.

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
              <span className="relative ms-1 flex h-2 w-2">
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
              <HeroTab
                href="/space"
                label={lang === "fa" ? "فضا" : "Space"}
                icon={<Rocket className="w-3.5 h-3.5" />}
                accent="#e8e6e1"
              />
              <HeroTab
                href="/social"
                label={lang === "fa" ? "شبکه‌ها" : "Social"}
                icon={<Send className="w-3.5 h-3.5" />}
                accent="#ef4444"
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
  const { data: priceData, isLoading } = useCryptoPrice("BTC");

  const up = (priceData?.change24h ?? 0) >= 0;

  return (
    <WidgetCard
      title={lang === "fa" ? "بیت‌کوین" : "Bitcoin"}
      icon={<Bitcoin className="w-3.5 h-3.5" />}
      accent="#f7931a"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : priceData ? (
        <>
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
            ${formatUsd(priceData.price, lang)}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold mt-1",
              numFontClass(lang),
              up ? "text-[var(--brand-accent)]" : "text-red-400"
            )}
          >
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatFa(Math.abs(priceData.change24h).toFixed(2), lang)}%
            <span className="opacity-60">24h</span>
            <span className="opacity-40 font-latin text-[9px]">· {priceData.source}</span>
          </div>
          {priceData.high24h !== undefined && priceData.low24h !== undefined && (
            <div className={cn("flex items-center justify-between text-[9px] text-[var(--brand-muted)]/80 mt-1.5 pt-1.5 border-t border-[var(--brand-border)]/50", numFontClass(lang))}>
              <span className="flex items-center gap-1">
                <span className="opacity-60">{lang === "fa" ? "بالا:" : "H:"}</span>
                <span className="text-[var(--brand-accent)]/80">${formatUsd(priceData.high24h, lang)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="opacity-60">{lang === "fa" ? "پایین:" : "L:"}</span>
                <span className="text-red-400/80">${formatUsd(priceData.low24h, lang)}</span>
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
// Simplified — the /api/market/iran-tether route was removed because Wallex
// and Nobitex APIs are geoblocked from Cloudflare Workers (US/EU regions).
// Instead of showing "ناموجود" (unavailable) to every user, we now show a
// static informational widget with a link to a real-time price source.
function TetherWidget() {
  const { lang } = useLanguage();
  const { data, refetch, isStale } = useTetherPrice();

  // Trigger first fetch on mount (client-side only)
  useEffect(() => {
    if (!data || isStale) refetch();
  }, [data, isStale, refetch]);

  const fa = (n: string | number) =>
    lang === "fa" ? String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : String(n);

  return (
    <WidgetCard
      title={lang === "fa" ? "تتر / تومان" : "USDT / Toman"}
      icon={<span className="text-[10px] font-bold font-latin">₮</span>}
      accent="#26a17b"
    >
      {data?.unavailable ? (
        <a
          href="https://nobitex.ir/"
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors", numFontClass(lang))}>
            {lang === "fa" ? "نمایش زنده" : "Live price"}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--brand-muted)] mt-1">
            <span>{lang === "fa" ? "در Nobitex" : "on Nobitex"}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      ) : data?.price ? (
        <button
          onClick={() => refetch()}
          className="block w-full text-start group"
          title={lang === "fa" ? "برای به‌روزرسانی کلیک کنید" : "Click to refresh"}
        >
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors", numFontClass(lang))}>
            {fa(Math.round(data.price).toLocaleString("en-US"))}
          </div>
          <div className={cn("flex items-center gap-1 text-[10px] text-[var(--brand-muted)] mt-1", numFontClass(lang))}>
            <span>{lang === "fa" ? "تومان" : "Toman"}</span>
            <span className="opacity-50">·</span>
            <span className="font-latin">Nobitex</span>
            {data.stale && (
              <span className="text-amber-400">
                · {lang === "fa" ? "کش" : "cached"}
              </span>
            )}
            {isStale && (
              <span className="text-amber-400 inline-flex items-center gap-0.5">
                · {lang === "fa" ? "به‌روزرسانی..." : "refreshing"}
              </span>
            )}
          </div>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-[var(--brand-surface-2)] animate-pulse" />
          <div className="h-3 w-20 rounded bg-[var(--brand-surface-2)] animate-pulse" />
        </div>
      )}
    </WidgetCard>
  );
}

/* ============= S&P 500 widget (English mode only — replaces Tether/Toman) ============= */
// Simplified — the /api/market/sp500 route was removed because Yahoo Finance
// often rate-limits or times out. We now show a static informational widget
// with a link to a real-time source.
function Sp500Widget() {
  const { lang } = useLanguage();
  return (
    <WidgetCard
      title="S&P 500"
      icon={<span className="text-[10px] font-bold font-latin">$</span>}
      accent="#10b981"
    >
      <a
        href="https://finance.yahoo.com/quote/%5EGSPC/"
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors", numFontClass(lang))}>
          {lang === "fa" ? "نمایش زنده" : "Live price"}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--brand-muted)] mt-1">
          <span>{lang === "fa" ? "در Yahoo Finance" : "on Yahoo Finance"}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    </WidgetCard>
  );
}

/* ============= Fear & Greed widget ============= */
function FearGreedWidget() {
  const { lang } = useLanguage();

  // Crypto Fear & Greed Index from alternative.me. Updates hourly upstream,
  // so we refresh via refetchOnWindowFocus (default) only.
  // staleTime 10min matches the upstream update frequency.
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
    // No refetchInterval — relies on refetchOnWindowFocus (default).
    // F&G updates hourly upstream; 10min staleTime + focus refetch
    // is plenty fresh.
    staleTime: 10 * 60_000,
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
          <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 opacity-30 relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-white shadow-lg"
              style={{
                insetInlineStart: `calc(${data.value}% - 2px)`,
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
              <span className="text-[var(--brand-muted)] font-normal ms-1">
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
  // Use `useLocalStorage` (SSR-safe via `useSyncExternalStore`) instead of
  // the `useEffect(() => setCity(readCity()), [])` pattern that triggers
  // React 19's ESLint `set-state-in-effect` warning.
  // The stored shape is the StoredCity from SettingsPanel: {id, name, country, lat, lon}.
  // We use that as-is and fall back to DEFAULT_CITY if the stored shape
  // is invalid (missing lat/lon).
  const storedCity = useLocalStorage<any>(WEATHER_KEY, DEFAULT_CITY);
  const hydrated = useMounted();

  // Normalize: SettingsPanel stores {name, country} but we display
  // nameFa/nameEn. Use `name` as a fallback for both.
  const city: CityChoice = {
    id: String(storedCity?.id ?? DEFAULT_CITY.id),
    nameFa: storedCity?.nameFa ?? storedCity?.name ?? DEFAULT_CITY.nameFa,
    nameEn: storedCity?.nameEn ?? storedCity?.name ?? DEFAULT_CITY.nameEn,
    lat: typeof storedCity?.lat === "number" ? storedCity.lat : DEFAULT_CITY.lat,
    lon: typeof storedCity?.lon === "number" ? storedCity.lon : DEFAULT_CITY.lon,
  };

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
    // No refetchInterval — relies on refetchOnWindowFocus (default).
    // Weather changes slowly; 10min staleTime + focus refetch is plenty.
    staleTime: 10 * 60_000,
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
        className="absolute top-0 end-0 w-px h-full"
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
export { formatUsd };
