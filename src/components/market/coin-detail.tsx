"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Globe,
  Twitter,
  Github,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Bell,
  BellRing,
  X,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { usePriceAlerts, type AlertDirection } from "@/hooks/use-price-alerts";
import { cn } from "@/lib/utils";
import { markdownToHtml, truncateMarkdown } from "@/lib/markdown";

interface CoinDetailProps {
  coinId: string;
}

/* ============= Types ============= */
interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  description: { en: string; [key: string]: string };
  links: {
    homepage: string[];
    twitter_screen_name?: string;
    subreddit_url?: string;
    repos_url: { github: string[]; bitbucket: string[] };
  };
  image: { thumb: string; small: string; large: string };
  market_cap_rank: number;
  categories: string[];
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_percentage_1h_in_currency: { usd: number };
    price_change_percentage_24h_in_currency: { usd: number };
    price_change_percentage_7d_in_currency: { usd: number };
    price_change_percentage_30d_in_currency: { usd: number };
    price_change_percentage_60d_in_currency: { usd: number };
    price_change_percentage_1y_in_currency: { usd: number };
    ath: { usd: number };
    ath_change_percentage: { usd: number };
    ath_date: { usd: string };
    atl: { usd: number };
    atl_change_percentage: { usd: number };
    atl_date: { usd: string };
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    fully_diluted_valuation: { usd: number } | null;
    sparkline_7d?: { price: number[] };
  };
}

/**
 * CoinDetail — minimal, lightweight coin detail page.
 *
 * Design goals (Phase 22):
 *  - Minimal & modern: clean lines, no heavy glassmorphism, no gradients
 *  - Lightweight: pure CSS, no backdrop-blur (which is GPU-intensive)
 *  - Fast: only 2 API calls (coingecko-coin + cmc-coin), 5min staleTime
 *  - Cohesive: uses the same design language as the rest of the site
 *
 * Data sources:
 *  1. CoinGecko (primary): price, market cap, supply, ATH/ATL, description, links, sparkline
 *  2. CoinMarketCap (fallback): tags, logo, description, URLs
 */
export function CoinDetail({ coinId }: CoinDetailProps) {
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const Back = isRTL ? ArrowLeft : ArrowRight;
  const [alertOpen, setAlertOpen] = useState(false);
  const { alerts, addAlert, permission, requestPermission } = usePriceAlerts();
  const coinAlerts = alerts.filter((a) => a.coinId === coinId);

  // --- Primary: CoinGecko coin detail ---
  // staleTime: 5min — coin detail doesn't change often
  // On rate-limit: return null instead of throwing → fall back to CMC
  const { data: coin, isLoading, error } = useQuery<CoinGeckoCoin | null>({
    queryKey: ["market", "coingecko-coin", coinId],
    queryFn: async () => {
      const res = await fetch(`/api/market/coingecko-coin?id=${encodeURIComponent(coinId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.rateLimited && json?.id) return json as CoinGeckoCoin;
      if (json?.rateLimited) return null;
      if (json?.error) throw new Error(json.error);
      return json as CoinGeckoCoin;
    },
    staleTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // --- Secondary: CMC coin metadata (tags, logo, description, URLs) ---
  // Uses coinId as the slug fallback (CoinGecko ID == CMC slug for most coins)
  const cmcSlug = coinId;
  const { data: cmcCoin } = useQuery<{
    name: string;
    symbol: string;
    slug: string;
    description: string;
    tags: Array<{ slug: string; name: string }>;
    category: string;
    logo: string;
    urls?: { website?: string[]; twitter?: string[]; reddit?: string[]; sourceCode?: string[] };
  } | null>({
    queryKey: ["market", "cmc-coin", cmcSlug],
    queryFn: async () => {
      const res = await fetch(`/api/market/cmc-coin?slug=${encodeURIComponent(cmcSlug)}`, { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.error) return null;
      return json;
    },
    staleTime: 5 * 60_000,
    retry: 0,
    enabled: !!cmcSlug,
  });

  // --- Tertiary: CMC listings (for price data when CoinGecko is rate-limited) ---
  // This query is shared with the market table (same queryKey), so it's free
  // if the user has already visited /crypto/market. It provides real price,
  // volume, market_cap, percent_change data for the fallback.
  const { data: cmcListings, isLoading: cmcListingsLoading } = useQuery<{
    coins: Array<{
      id: number;
      name: string;
      symbol: string;
      slug: string;
      cmcRank: number;
      price: number;
      volume24h: number;
      marketCap: number;
      percentChange1h: number;
      percentChange24h: number;
      percentChange7d: number;
      percentChange30d: number;
      percentChange60d: number;
      percentChange90d: number;
      circulatingSupply: number;
      totalSupply: number;
      maxSupply: number | null;
    }>;
  }>({
    queryKey: ["market", "cmc-listings", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/cmc-listings?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { coins: json?.coins || [] };
    },
    staleTime: 5 * 60_000,
  });

  // Find the matching CMC listing by slug or symbol
  const cmcListing = useMemo(() => {
    if (!cmcListings?.coins) return null;
    return cmcListings.coins.find(
      (c) => c.slug === coinId || c.symbol.toLowerCase() === coinId.toLowerCase()
    ) || null;
  }, [cmcListings, coinId]);

  // --- Quaternary: CoinGecko markets (shared cache with market page) ---
  // This query is shared with the market table (same queryKey ["market",
  // "coingecko-markets", "top100"]), so it's FREE if the user has already
  // visited /crypto/market. It provides high_24h, low_24h, ath, atl —
  // data that CMC listings doesn't have.
  const { data: geckoMarkets } = useQuery<{ coins: Array<{
    id: string;
    high_24h: number;
    low_24h: number;
    ath: number;
    atl: number;
  }> }>({
    queryKey: ["market", "coingecko-markets", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/coingecko-markets?per_page=100&sparkline=false", { cache: "no-store" });
      if (!res.ok) return { coins: [] };
      const json = await res.json();
      // If rate-limited with cached data, serve it
      if (json?.rateLimited && json?.coins?.length > 0) {
        return { coins: json.coins };
      }
      return { coins: json?.coins || [] };
    },
    staleTime: 2 * 60_000,
  });

  // Find the matching CoinGecko market data for this coin
  const geckoMarket = useMemo(() => {
    if (!geckoMarkets?.coins) return null;
    return geckoMarkets.coins.find((c) => c.id === coinId) || null;
  }, [geckoMarkets, coinId]);

  const fa = (n: string | number) =>
    lang === "fa" ? String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : String(n);

  const fmtPrice = (p: number) => {
    if (p >= 1) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 0.01) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(8)}`;
  };

  const fmtCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  // Wait for both CoinGecko AND cmcListings before showing fallback
  // (cmcListings provides the real price data for the fallback)
  const isLoadingAll = isLoading || (cmcListingsLoading && !coin);

  if (isLoadingAll) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded bg-[var(--brand-surface-2)]" />
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[var(--brand-surface-2)]" />
            <div className="space-y-2">
              <div className="h-6 w-32 rounded bg-[var(--brand-surface-2)]" />
              <div className="h-4 w-24 rounded bg-[var(--brand-surface-2)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-[var(--brand-surface-2)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Build a fallback displayCoin from CMC data if CoinGecko is null
  // Use cmcListing for price/volume/market_cap data, cmcCoin for metadata
  // Use geckoMarket for high_24h/low_24h/ath/atl if available (shared cache)
  // If geckoMarket is also null (rate-limited), approximate high/low from
  // current price and 24h change percentage
  let displayCoin = coin;
  let usingCmcFallback = false;
  if (!displayCoin && (cmcCoin || cmcListing)) {
    usingCmcFallback = true;
    const name = cmcCoin?.name || cmcListing?.name || coinId;
    const symbol = cmcCoin?.symbol || cmcListing?.symbol || "";
    const price = cmcListing?.price || 0;
    const volume24h = cmcListing?.volume24h || 0;
    const marketCap = cmcListing?.marketCap || 0;
    const change1h = cmcListing?.percentChange1h || 0;
    const change24h = cmcListing?.percentChange24h || 0;
    const change7d = cmcListing?.percentChange7d || 0;
    const change30d = cmcListing?.percentChange30d || 0;
    const change60d = cmcListing?.percentChange60d || 0;
    const change90d = cmcListing?.percentChange90d || 0;
    const circulatingSupply = cmcListing?.circulatingSupply || 0;
    const totalSupply = cmcListing?.totalSupply || 0;
    const maxSupply = cmcListing?.maxSupply || null;
    const rank = cmcListing?.cmcRank || 0;

    // high_24h and low_24h: only use real data from geckoMarket (shared cache)
    // Do NOT approximate — showing fake data is worse than showing nothing.
    // If geckoMarket is null (CoinGecko rate-limited), these will be 0 and
    // the corresponding UI sections will be hidden.
    const high24h = geckoMarket?.high_24h || 0;
    const low24h = geckoMarket?.low_24h || 0;

    displayCoin = {
      id: coinId,
      symbol,
      name,
      description: { en: cmcCoin?.description || "", fa: cmcCoin?.description || "" },
      links: {
        homepage: cmcCoin?.urls?.website || [],
        twitter_screen_name: cmcCoin?.urls?.twitter?.[0] || undefined,
        subreddit_url: cmcCoin?.urls?.reddit?.[0] || undefined,
        repos_url: { github: cmcCoin?.urls?.sourceCode || [], bitbucket: [] },
      },
      image: {
        thumb: cmcCoin?.logo || "",
        small: cmcCoin?.logo || "",
        large: cmcCoin?.logo || "",
      },
      market_cap_rank: rank,
      categories: (cmcCoin?.tags || []).map((t) => t.name),
      market_data: {
        current_price: { usd: price },
        market_cap: { usd: marketCap },
        total_volume: { usd: volume24h },
        // high_24h and low_24h: use geckoMarket if available, otherwise approximate
        high_24h: { usd: high24h },
        low_24h: { usd: low24h },
        price_change_percentage_1h_in_currency: { usd: change1h },
        price_change_percentage_24h_in_currency: { usd: change24h },
        price_change_percentage_7d_in_currency: { usd: change7d },
        price_change_percentage_30d_in_currency: { usd: change30d },
        price_change_percentage_60d_in_currency: { usd: change60d },
        price_change_percentage_1y_in_currency: { usd: change90d },
        // ath and atl: use geckoMarket if available, otherwise 0 (no good approximation)
        ath: { usd: geckoMarket?.ath || 0 },
        ath_change_percentage: { usd: 0 },
        ath_date: { usd: "" },
        atl: { usd: geckoMarket?.atl || 0 },
        atl_change_percentage: { usd: 0 },
        atl_date: { usd: "" },
        circulating_supply: circulatingSupply,
        total_supply: totalSupply || null,
        max_supply: maxSupply,
        fully_diluted_valuation: marketCap ? { usd: marketCap } : null,
      },
    } as CoinGeckoCoin;
  }

  if (error || !displayCoin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-[var(--brand-text)] mb-4">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button onClick={() => router.push("/crypto/market")} className="px-4 py-2 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110">
          {lang === "fa" ? "بازگشت به بازار" : "Back to market"}
        </button>
      </div>
    );
  }

  const md = displayCoin.market_data;
  const change24h = md.price_change_percentage_24h_in_currency?.usd || 0;
  const up = change24h >= 0;
  const description = lang === "fa" ? (displayCoin.description.fa || displayCoin.description.en) : displayCoin.description.en;
  const accentColor = up ? "var(--brand-accent)" : "#f87171";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/crypto/market")}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)] transition-colors mb-4"
      >
        <Back className="w-3.5 h-3.5" />
        {lang === "fa" ? "بازگشت به بازار" : "Back to market"}
      </button>

      {/* Header — minimal, no glassmorphism */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {displayCoin.image?.large && (
            <img
              src={displayCoin.image.large}
              alt={displayCoin.name}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl md:text-2xl font-bold text-[var(--brand-text)]">
                {displayCoin.name}
              </h1>
              <span className="text-sm font-latin text-[var(--brand-muted)] uppercase">
                {displayCoin.symbol}
              </span>
              {displayCoin.market_cap_rank > 0 && (
                <span className="text-[10px] font-latin text-[var(--brand-muted)] bg-[var(--brand-surface-2)] px-2 py-0.5 rounded-full">
                  #{fa(displayCoin.market_cap_rank)}
                </span>
              )}
              {usingCmcFallback && (
                <span className="text-[10px] font-latin text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {lang === "fa" ? "حالت محدود" : "Limited data"}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-latin tabular-nums text-2xl font-bold text-[var(--brand-text)]">
                {fa(fmtPrice(md.current_price.usd))}
              </span>
              <span className={cn("font-latin tabular-nums text-sm font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
                {up ? "+" : ""}{fa(change24h.toFixed(2))}%
              </span>
              <span className="text-[10px] text-[var(--brand-muted)]">24h</span>
            </div>
          </div>
          {/* Price Alert Button */}
          <button
            onClick={() => setAlertOpen((v) => !v)}
            className={cn(
              "relative p-2 rounded-lg border transition-colors shrink-0",
              coinAlerts.length > 0
                ? "bg-[var(--brand-accent-soft)] border-[var(--brand-accent)]/40 text-[var(--brand-accent)]"
                : "bg-[var(--brand-surface)] border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
            )}
            aria-label={lang === "fa" ? "هشدار قیمت" : "Price alert"}
          >
            {coinAlerts.length > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {coinAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[var(--brand-accent)] text-[#04201d] text-[9px] font-bold font-latin">
                {fa(coinAlerts.length)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Price Alert Panel */}
      {alertOpen && (
        <PriceAlertPanel
          coinId={coinId}
          coinName={displayCoin.name}
          coinSymbol={displayCoin.symbol}
          currentPrice={md.current_price.usd}
          lang={lang}
          alerts={coinAlerts}
          addAlert={addAlert}
          permission={permission}
          requestPermission={requestPermission}
          onClose={() => setAlertOpen(false)}
        />
      )}

      {/* Sparkline — minimal SVG, no gradients */}
      {md.sparkline_7d?.price && md.sparkline_7d.price.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
              {lang === "fa" ? "نمودار ۷ روزه" : "7-day chart"}
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-latin text-[var(--brand-muted)]">
              <span>H: {fa(fmtPrice(Math.max(...md.sparkline_7d.price)))}</span>
              <span>L: {fa(fmtPrice(Math.min(...md.sparkline_7d.price)))}</span>
            </div>
          </div>
          <Sparkline prices={md.sparkline_7d.price} accent={accentColor} />
        </section>
      )}

      {/* External links */}
      <div className="flex flex-wrap gap-2 mb-6">
        {displayCoin.links?.homepage?.[0] && <ExtLink href={displayCoin.links.homepage[0]} icon={<Globe className="w-3.5 h-3.5" />} label={lang === "fa" ? "وب‌سایت" : "Website"} />}
        {displayCoin.links?.twitter_screen_name && <ExtLink href={`https://twitter.com/${displayCoin.links.twitter_screen_name}`} icon={<Twitter className="w-3.5 h-3.5" />} label="Twitter" />}
        {displayCoin.links?.subreddit_url && <ExtLink href={displayCoin.links.subreddit_url} icon={<MessageCircle className="w-3.5 h-3.5" />} label="Reddit" />}
        {displayCoin.links?.repos_url?.github?.[0] && <ExtLink href={displayCoin.links.repos_url.github[0]} icon={<Github className="w-3.5 h-3.5" />} label="GitHub" />}
        <ExtLink href={`https://www.coingecko.com/en/coins/${displayCoin.id}`} icon={<ExternalLink className="w-3.5 h-3.5" />} label="CoinGecko" />
        <ExtLink href={`https://coinmarketcap.com/currencies/${cmcSlug || displayCoin.id}/`} icon={<ExternalLink className="w-3.5 h-3.5" />} label="CMC" />
      </div>

      {/* Stats grid — hide high/low when 0 (no real data available) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6">
        <StatCard label={lang === "fa" ? "مارکت کپ" : "Market Cap"} value={fa(fmtCompact(md.market_cap?.usd || 0))} />
        <StatCard label={lang === "fa" ? "حجم ۲۴س" : "24h Volume"} value={fa(fmtCompact(md.total_volume?.usd || 0))} />
        {(md.high_24h?.usd || 0) > 0 && (
          <StatCard label={lang === "fa" ? "بالاترین ۲۴س" : "24h High"} value={fa(fmtPrice(md.high_24h.usd))} accent="#2dd4bf" />
        )}
        {(md.low_24h?.usd || 0) > 0 && (
          <StatCard label={lang === "fa" ? "پایین‌ترین ۲۴س" : "24h Low"} value={fa(fmtPrice(md.low_24h.usd))} accent="#f87171" />
        )}
        {md.fully_diluted_valuation?.usd && (
          <StatCard label={lang === "fa" ? "ارزش کامل" : "FDV"} value={fa(fmtCompact(md.fully_diluted_valuation.usd))} />
        )}
      </section>

      {/* 24h Range Bar — visualises where current price sits between
          low_24h and high_24h. Only shown when both bounds are real
          (non-zero) and the range is positive (high > low). Zero API
          cost — uses data already fetched from CoinGecko. */}
      {(md.high_24h?.usd || 0) > 0 && (md.low_24h?.usd || 0) > 0 &&
       md.high_24h.usd > md.low_24h.usd && (
        <section className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
              {lang === "fa" ? "بازه ۲۴ ساعته" : "24h Range"}
            </h2>
            <span className="text-[10px] font-latin text-[var(--brand-muted)]">
              {fa(((md.high_24h.usd - md.low_24h.usd) / md.low_24h.usd * 100).toFixed(2))}% {lang === "fa" ? "نوسان" : "range"}
            </span>
          </div>
          <RangeBar
            low={md.low_24h.usd}
            high={md.high_24h.usd}
            current={md.current_price.usd}
            fa={fa}
            fmtPrice={fmtPrice}
            lang={lang}
          />
        </section>
      )}

      {/* Price changes */}
      <section className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
        <h2 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">
          {lang === "fa" ? "تغییرات قیمت" : "Price Changes"}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <PriceChange label="1h" value={md.price_change_percentage_1h_in_currency?.usd} fa={fa} />
          <PriceChange label="24h" value={md.price_change_percentage_24h_in_currency?.usd} fa={fa} />
          <PriceChange label="7d" value={md.price_change_percentage_7d_in_currency?.usd} fa={fa} />
          <PriceChange label="30d" value={md.price_change_percentage_30d_in_currency?.usd} fa={fa} />
          <PriceChange label="60d" value={md.price_change_percentage_60d_in_currency?.usd} fa={fa} />
          <PriceChange label="1y" value={md.price_change_percentage_1y_in_currency?.usd} fa={fa} />
        </div>
      </section>

      {/* ATH / ATL — only show if we have real data (not 0) */}
      {(md.ath?.usd || 0) > 0 && (md.atl?.usd || 0) > 0 && (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <h3 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
              {lang === "fa" ? "بالاترین تاریخی" : "All-Time High"}
            </h3>
          </div>
          <div className="font-latin tabular-nums text-lg font-bold text-[var(--brand-text)]">
            {fa(fmtPrice(md.ath?.usd || 0))}
          </div>
          <div className="text-[10px] text-[var(--brand-muted)] mt-1">
            {md.ath_date?.usd ? fa(fmtDate(md.ath_date.usd)) : ""} ·{" "}
            <span className="text-red-400 font-bold">
              {fa((md.ath_change_percentage?.usd || 0).toFixed(2))}%
            </span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3 h-3 text-[var(--brand-accent)]" />
            <h3 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
              {lang === "fa" ? "پایین‌ترین تاریخی" : "All-Time Low"}
            </h3>
          </div>
          <div className="font-latin tabular-nums text-lg font-bold text-[var(--brand-text)]">
            {fa(fmtPrice(md.atl?.usd || 0))}
          </div>
          <div className="text-[10px] text-[var(--brand-muted)] mt-1">
            {md.atl_date?.usd ? fa(fmtDate(md.atl_date.usd)) : ""} ·{" "}
            <span className="text-[var(--brand-accent)] font-bold">
              {fa((md.atl_change_percentage?.usd || 0).toFixed(2))}%
            </span>
          </div>
        </div>
      </section>
      )}

      {/* Supply */}
      <section className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
        <h2 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">
          {lang === "fa" ? "عرضه" : "Supply"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[var(--brand-muted)]">{lang === "fa" ? "در گردش: " : "Circulating: "}</span>
            <span className="font-latin tabular-nums text-[var(--brand-text)]">
              {fa(fmtCompact(md.circulating_supply || 0))} {displayCoin.symbol.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-[var(--brand-muted)]">{lang === "fa" ? "کل: " : "Total: "}</span>
            <span className="font-latin tabular-nums text-[var(--brand-text)]">
              {md.total_supply ? `${fa(fmtCompact(md.total_supply))} ${displayCoin.symbol.toUpperCase()}` : "—"}
            </span>
          </div>
          <div>
            <span className="text-[var(--brand-muted)]">{lang === "fa" ? "حداکثر: " : "Max: "}</span>
            <span className="font-latin tabular-nums text-[var(--brand-text)]">
              {md.max_supply ? `${fa(fmtCompact(md.max_supply))} ${displayCoin.symbol.toUpperCase()}` : "∞"}
            </span>
          </div>
        </div>
        {md.max_supply && md.circulating_supply && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-[var(--brand-surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--brand-accent)]"
                style={{ width: `${Math.min(100, (md.circulating_supply / md.max_supply) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--brand-muted)] mt-1 font-latin">
              {fa(((md.circulating_supply / md.max_supply) * 100).toFixed(1))}% {lang === "fa" ? "ماین شده" : "mined"}
            </div>
          </div>
        )}
      </section>

      {/* Categories & Tags — show only from cmcCoin.tags to avoid duplicates */}
      {cmcCoin?.tags && cmcCoin.tags.length > 0 && (
        <section className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <h2 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-2">
            {lang === "fa" ? "دسته‌ها و برچسب‌ها" : "Categories & Tags"}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {cmcCoin.tags.filter(t => t.name).slice(0, 10).map((tag) => (
              <span key={tag.slug} className="text-[10px] px-2 py-1 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] border border-[var(--brand-accent)]/20">
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {description && (
        <section className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <h2 className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">
            {lang === "fa" ? "درباره" : "About"}
          </h2>
          <div
            className="article-body text-sm text-[var(--brand-text)] leading-relaxed max-w-none prose-sm"
            dir="auto"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(truncateMarkdown(description, 3)) }}
          />
        </section>
      )}
    </div>
  );
}

/* ============= Sub-components (minimal, no GPU-intensive effects) ============= */

/**
 * RangeBar — visualises where the current price sits between a low and a
 * high bound. Pure SVG + CSS, zero JS animation, zero API cost.
 *
 * Layout:
 *   Low label  [============●================]  High label
 *              ↑ gradient bar   ↑ marker
 *
 * The bar uses a horizontal gradient from red (low) → amber (mid) → teal
 * (high) so the user can see at a glance whether the current price is
 * in the lower or upper half of the 24h range.
 */
function RangeBar({
  low,
  high,
  current,
  fa,
  fmtPrice,
  lang,
}: {
  low: number;
  high: number;
  current: number;
  fa: (n: string | number) => string;
  fmtPrice: (n: number) => string;
  lang: "fa" | "en";
}) {
  // Clamp current to [low, high] so the marker stays within the bar.
  const clamped = Math.max(low, Math.min(high, current));
  const pct = ((clamped - low) / (high - low)) * 100;
  // Marker is a small dot on the bar.
  return (
    <div>
      <div className="relative h-2 rounded-full overflow-hidden bg-[var(--brand-surface-2)]">
        {/* Gradient track: red → amber → teal */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(to right, #f87171 0%, #fbbf24 50%, #2dd4bf 100%)",
            opacity: 0.5,
          }}
        />
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--brand-bg)] bg-[var(--brand-text)] shadow-md"
          style={{ insetInlineStart: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] font-latin tabular-nums">
        <span className="text-red-400">{fa(fmtPrice(low))}</span>
        <span className="text-[var(--brand-muted)]">
          {lang === "fa" ? "اکنون: " : "Now: "}
          <span className="font-bold text-[var(--brand-text)]">{fa(fmtPrice(current))}</span>
        </span>
        <span className="text-[var(--brand-accent)]">{fa(fmtPrice(high))}</span>
      </div>
    </div>
  );
}

function Sparkline({ prices, accent }: { prices: number[]; accent: string }) {
  if (!prices || prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 600;
  const height = 80;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={accent} strokeWidth="1.5" />
    </svg>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)]">
      <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1">
        {label}
      </div>
      <div
        className="font-latin tabular-nums text-sm font-bold"
        style={{ color: accent || "var(--brand-text)" }}
      >
        {value}
      </div>
    </div>
  );
}

function PriceChange({ label, value, fa }: { label: string; value?: number; fa: (n: string | number) => string }) {
  if (value === undefined || value === null) {
    return (
      <div className="text-center">
        <div className="text-[10px] text-[var(--brand-muted)] mb-1">{label}</div>
        <div className="font-latin tabular-nums text-sm text-[var(--brand-muted)]">—</div>
      </div>
    );
  }
  const up = value >= 0;
  return (
    <div className="text-center">
      <div className="text-[10px] text-[var(--brand-muted)] mb-1">{label}</div>
      <div className={cn("font-latin tabular-nums text-sm font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
        {up ? "+" : ""}{fa(value.toFixed(2))}%
      </div>
    </div>
  );
}

function ExtLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

/* ============= Price Alert Panel ============= */
function PriceAlertPanel({
  coinId,
  coinName,
  coinSymbol,
  currentPrice,
  lang,
  alerts,
  addAlert,
  permission,
  requestPermission,
  onClose,
}: {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  currentPrice: number;
  lang: "fa" | "en";
  alerts: Array<{ id: string; direction: AlertDirection; targetPrice: number; active: boolean; triggered: boolean; currentPrice?: number }>;
  addAlert: (alert: { coinId: string; symbol: string; name: string; direction: AlertDirection; targetPrice: number; currentPrice: number }) => boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<string>;
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [targetPrice, setTargetPrice] = useState<string>(currentPrice.toFixed(2));

  const fa = (n: string | number) =>
    lang === "fa" ? String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : String(n);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    const added = addAlert({
      coinId,
      symbol: coinSymbol,
      name: coinName,
      direction,
      targetPrice: price,
      currentPrice,
    });
    if (added) {
      setTargetPrice(currentPrice.toFixed(2));
      setDirection("above");
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent-soft)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--brand-accent)]" />
          <span className="text-xs font-bold text-[var(--brand-accent)] uppercase tracking-wider font-latin">
            {lang === "fa" ? "هشدار قیمت" : "Price Alert"}
          </span>
          <span className="text-[10px] text-[var(--brand-muted)] font-latin">
            {fa(currentPrice.toFixed(2))} USD
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)] transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {permission !== "granted" && (
        <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 mb-2">
            {lang === "fa" ? "برای دریافت اعلان‌ها، اجازه اطلاع‌رسانی را بدهید" : "Enable notifications to receive alerts"}
          </p>
          <button
            onClick={() => requestPermission()}
            className="px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-bold hover:brightness-110 transition-all"
          >
            {lang === "fa" ? "فعال‌سازی اعلان‌ها" : "Enable notifications"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as AlertDirection)}
          className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--brand-text)] focus:outline-none focus:border-[var(--brand-accent)]"
        >
          <option value="above">{lang === "fa" ? "بالاتر از" : "Above"}</option>
          <option value="below">{lang === "fa" ? "پایین‌تر از" : "Below"}</option>
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--brand-muted)]">$</span>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            step="0.01"
            min="0"
            className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--brand-text)] font-latin tabular-nums w-28 focus:outline-none focus:border-[var(--brand-accent)]"
            placeholder={currentPrice.toFixed(2)}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110 transition-all"
        >
          {lang === "fa" ? "افزودن هشدار" : "Add alert"}
        </button>
      </form>

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-[var(--brand-muted)] uppercase tracking-wider font-latin mb-1">
            {lang === "fa" ? "هشدارهای فعال" : "Active alerts"}
          </div>
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--brand-surface)]/50 text-xs">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  alert.triggered ? "bg-amber-400" : alert.active ? "bg-[var(--brand-accent)]" : "bg-[var(--brand-muted)]"
                )} />
                <span className="text-[var(--brand-text)]">
                  {alert.direction === "above" ? (lang === "fa" ? "بالاتر از" : "Above") : (lang === "fa" ? "پایین‌تر از" : "Below")}
                </span>
                <span className="font-latin tabular-nums font-bold text-[var(--brand-text)]">
                  ${fa(alert.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                </span>
                {alert.triggered && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                    {lang === "fa" ? "فعال شد" : "TRIGGERED"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
