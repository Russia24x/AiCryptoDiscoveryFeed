"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  TrendingUp,
  Flame,
  Activity,
  BarChart3,
  Star,
  StarOff,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useUIStore } from "@/hooks/use-ui-store";
import { GlassCard, StatCard, Sparkline, ProgressBar, Badge } from "./ui-primitives";
import { cn } from "@/lib/utils";

/* ============= Types ============= */
interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  price_change_percentage_60d_in_currency?: number;
  price_change_percentage_90d_in_currency?: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  atl: number;
  dominance?: number;
  tags?: string[];
}

interface CmcCoin {
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
  dominance: number;
  tags: string[];
}

interface GlobalStats {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  othersDominance: number;
  activeCryptoCurrencies: number;
  activeExchanges: number;
  defiMarketCap: number;
  defiVolume24h: number;
  stablecoinMarketCap: number;
  derivativesVolume24h: number;
  totalMarketCapYesterdayPctChange: number;
  altcoinMarketCap?: number;
  altcoinVolume24h?: number;
  stablecoinVolume24h?: number;
  activeMarketPairs?: number;
  totalVolume24hYesterdayPctChange?: number;
}

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
}

interface TopGainer {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmcRank: number;
  price: number;
  volume24h: number;
  marketCap: number;
  percentChange24h: number;
  tags: string[];
}

interface FngHistory {
  data: Array<{ value: number; classification: string; timestamp: number; date: string }>;
}

type SortField = "market_cap_rank" | "current_price" | "price_change_percentage_24h" | "total_volume" | "market_cap" | "price_change_percentage_30d_in_currency";
type SortDir = "asc" | "desc";

const fa = (n: string | number, lang: "fa" | "en") =>
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

/* ============= Main Component ============= */
export function MarketIntelligence() {
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  // Use Zustand for persistent UI state (survives page navigation)
  const sortField = useUIStore((s) => s.marketSortField);
  const sortDir = useUIStore((s) => s.marketSortDir);
  const setMarketSort = useUIStore((s) => s.setMarketSort);
  const showWatchlistOnly = useUIStore((s) => s.marketShowWatchlistOnly);
  const setMarketShowWatchlistOnly = useUIStore((s) => s.setMarketShowWatchlistOnly);
  const activeTag = useUIStore((s) => s.marketActiveTag);
  const setMarketActiveTag = useUIStore((s) => s.setMarketActiveTag);
  const viewMode = useUIStore((s) => s.marketViewMode);
  const setMarketViewMode = useUIStore((s) => s.setMarketViewMode);
  const { watchlist, isWatched, toggle: toggleWatch, hydrated: watchHydrated } = useWatchlist();

  // --- Coin list (top 100) ---
  // staleTime: 2min — reduces API calls by 50%
  // retry: 2 with exponential backoff — more resilient to transient errors
  // If CoinGecko is rate-limited with no cached data, we DON'T throw —
  // instead we return an empty array and the component falls back to
  // CMC listings data (which has price + rank info).
  const { data: marketData, isLoading, error, refetch, isFetching } = useQuery<{ coins: Coin[] }>({
    queryKey: ["market", "coingecko-markets", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/coingecko-markets?per_page=100&sparkline=false", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // If rate-limited with cached coins, serve them.
      if (json?.rateLimited && json?.coins?.length > 0) {
        return json as { coins: Coin[] };
      }
      // If rate-limited with NO cached coins, return empty array instead of
      // throwing. The component will fall back to CMC listings data.
      if (json?.rateLimited) {
        return { coins: [] };
      }
      return json as { coins: Coin[] };
    },
    staleTime: 2 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // --- CMC listings (for tags/category filter) ---
  // staleTime: 5min (was 2min) — tags don't change often
  const { data: cmcData } = useQuery<{ coins: CmcCoin[] }>({
    queryKey: ["market", "cmc-listings", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/cmc-listings?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { coins: (json?.coins || []) as CmcCoin[] };
    },
    staleTime: 5 * 60_000,
  });

  // Build a symbol → tags map from CMC data
  const symbolToTags = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of cmcData?.coins || []) {
      map.set(c.symbol.toUpperCase(), c.tags || []);
    }
    return map;
  }, [cmcData]);

  // Extract unique tags from top 100 coins (sorted by frequency)
  const availableTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    for (const c of cmcData?.coins || []) {
      for (const tag of c.tags || []) {
        // Filter out noisy tags (portfolio tags, exchange-specific, etc.)
        if (tag.includes("portfolio") || tag.includes("ecosystem") ||
            tag.includes("bankruptcy") || tag.includes("listing") ||
            tag.includes("sec-cftc") || tag.includes("alt-season")) continue;
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCount.entries())
      .filter(([, count]) => count >= 2) // At least 2 coins have this tag
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag);
  }, [cmcData]);

  // --- Global stats ---
  // staleTime: 2min (was 1min) — market cap doesn't change every minute
  const { data: globalStats } = useQuery<GlobalStats>({
    queryKey: ["market", "global-stats"],
    queryFn: async () => {
      const res = await fetch("/api/market/global-stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as GlobalStats;
    },
    staleTime: 2 * 60_000,
  });

  // --- Trending coins ---
  // staleTime: 10min (was 5min) — trending list changes slowly
  const { data: trendingData } = useQuery<{ coins: TrendingCoin[] }>({
    queryKey: ["market", "trending"],
    queryFn: async () => {
      const res = await fetch("/api/market/trending", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { coins: TrendingCoin[] };
    },
    staleTime: 10 * 60_000,
  });

  // --- Fear & Greed Historical (30 days) ---
  // staleTime: 30min — historical data doesn't change
  const { data: fngHistory } = useQuery<FngHistory>({
    queryKey: ["market", "fear-greed-historical", 30],
    queryFn: async () => {
      const res = await fetch("/api/market/fear-greed-historical?days=30", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as FngHistory;
    },
    staleTime: 30 * 60_000,
  });

  // --- Top Gainers (24h) ---
  // staleTime: 5min — gainers change more frequently than trending
  const { data: topGainersData } = useQuery<{ coins: TopGainer[] }>({
    queryKey: ["market", "top-gainers"],
    queryFn: async () => {
      const res = await fetch("/api/market/top-gainers?limit=7", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { coins: (json?.coins || []) as TopGainer[] };
    },
    staleTime: 5 * 60_000,
  });

  // If CoinGecko data is empty (rate-limited), fall back to CMC listings.
  // CMC data has: id, name, symbol, slug, cmcRank, price, volume24h,
  // marketCap, percentChange24h, tags. We map it to the Coin interface.
  const coingeckoCoins = marketData?.coins || [];
  const usingFallback = coingeckoCoins.length === 0 && (cmcData?.coins?.length || 0) > 0;
  const coins: Coin[] = usingFallback
    ? (cmcData!.coins.map((c) => ({
        id: c.slug || c.symbol.toLowerCase(),
        symbol: c.symbol,
        name: c.name,
        image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
        current_price: c.price,
        market_cap: c.marketCap,
        market_cap_rank: c.cmcRank,
        total_volume: c.volume24h,
        high_24h: 0,
        low_24h: 0,
        price_change_percentage_1h_in_currency: c.percentChange1h,
        price_change_percentage_24h: c.percentChange24h,
        price_change_percentage_7d_in_currency: c.percentChange7d,
        price_change_percentage_30d_in_currency: c.percentChange30d,
        price_change_percentage_60d_in_currency: c.percentChange60d,
        price_change_percentage_90d_in_currency: c.percentChange90d,
        circulating_supply: c.circulatingSupply,
        total_supply: c.totalSupply || null,
        max_supply: c.maxSupply,
        ath: 0,
        atl: 0,
        dominance: c.dominance,
        tags: c.tags,
      } as Coin)))
    : coingeckoCoins;

  const filtered = useMemo(() => {
    let result = coins;
    // Filter by tag/category
    if (activeTag) {
      result = result.filter((c) => {
        const tags = symbolToTags.get(c.symbol.toUpperCase()) || [];
        return tags.includes(activeTag);
      });
    }
    // Filter by watchlist toggle
    if (showWatchlistOnly && watchHydrated) {
      result = result.filter((c) => watchlist.includes(c.id));
    }
    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [coins, search, showWatchlistOnly, watchlist, watchHydrated, activeTag, symbolToTags]);

  // Sort: watchlist coins first (when not in "watchlist only" mode), then by selected field
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      // If not in watchlist-only mode, pin watched coins to top
      if (!showWatchlistOnly && watchHydrated) {
        const aWatched = watchlist.includes(a.id) ? 0 : 1;
        const bWatched = watchlist.includes(b.id) ? 0 : 1;
        if (aWatched !== bWatched) return aWatched - bWatched;
      }
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [filtered, sortField, sortDir, showWatchlistOnly, watchlist, watchHydrated]);

  const onSort = (field: SortField) => {
    if (field === sortField) {
      setMarketSort(field, sortDir === "asc" ? "desc" : "asc");
    } else {
      setMarketSort(field, field === "market_cap_rank" ? "asc" : "desc");
    }
  };

  const onCoinClick = (coin: Coin) => router.push(`/crypto/market/${coin.id}`);

  return (
    <div className="min-h-screen bg-[var(--brand-bg)]">
      {/* Sticky header */}
      <div className="sticky top-16 z-30 bg-[var(--brand-bg)]/95 backdrop-blur-xl border-b border-[var(--brand-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/30 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-[var(--brand-accent)]" />
              </div>
              <h1 className="font-display text-lg md:text-xl font-bold text-[var(--brand-text)] truncate">
                {lang === "fa" ? "هوش بازار" : "Market Intelligence"}
              </h1>
              <Badge variant="accent" className="hidden sm:inline-flex">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </Badge>
            </div>
            {/* Watchlist toggle */}
            <button
              onClick={() => setMarketShowWatchlistOnly(!showWatchlistOnly)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                showWatchlistOnly
                  ? "bg-[var(--brand-accent)] text-[#04201d] shadow-md shadow-[var(--brand-accent)]/20"
                  : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40"
              )}
              aria-label={lang === "fa" ? "واچ‌لیست" : "Watchlist"}
            >
              {showWatchlistOnly ? <Star className="w-3.5 h-3.5 fill-current" /> : <Star className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lang === "fa" ? "واچ‌لیست" : "Watch"}</span>
              {watchlist.length > 0 && (
                <span className={cn(
                  "min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-latin",
                  showWatchlistOnly ? "bg-[#04201d]/20 text-[#04201d]" : "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
                )}>
                  {fa(watchlist.length, lang)}
                </span>
              )}
            </button>
            {/* Search */}
            <div className="relative flex items-center group">
              <Search className="absolute left-3 w-3.5 h-3.5 text-[var(--brand-muted)] pointer-events-none group-focus-within:text-[var(--brand-accent)] transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی ارز..." : "Search..."}
                className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full pl-9 pr-3 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20 w-32 sm:w-48 transition-all"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>
        {/* Category tags filter bar */}
        {availableTags.length > 0 && (
          <div className="border-t border-[var(--brand-border)]/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setMarketActiveTag(null)}
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
                    !activeTag
                      ? "bg-[var(--brand-accent)] text-[#04201d]"
                      : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                  )}
                >
                  {lang === "fa" ? "همه" : "All"}
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setMarketActiveTag(activeTag === tag ? null : tag)}
                    className={cn(
                      "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap capitalize",
                      activeTag === tag
                        ? "bg-[var(--brand-accent)] text-[#04201d]"
                        : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30"
                    )}
                  >
                    {tag.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Stats Bar — minimal cards */}
      {globalStats && globalStats.totalMarketCap > 0 && (
        <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
              <StatCard
                label={lang === "fa" ? "مارکت کپ کل" : "Total M.Cap"}
                value={fa(fmtCompact(globalStats.totalMarketCap), lang)}
                change={globalStats.totalMarketCapYesterdayPctChange}
                accent="#2dd4bf"
              />
              <StatCard
                label={lang === "fa" ? "حجم ۲۴س" : "24h Volume"}
                value={fa(fmtCompact(globalStats.totalVolume24h), lang)}
                accent="#38bdf8"
              />
              <StatCard
                label="BTC.D"
                value={`${fa(globalStats.btcDominance.toFixed(1), lang)}%`}
                accent="#f7931a"
              />
              <StatCard
                label="ETH.D"
                value={`${fa(globalStats.ethDominance.toFixed(1), lang)}%`}
                accent="#627eea"
              />
              <StatCard
                label={lang === "fa" ? "ارزها" : "Coins"}
                value={fa(globalStats.activeCryptoCurrencies.toLocaleString(), lang)}
                accent="#a78bfa"
              />
              <StatCard
                label={lang === "fa" ? "دیفای" : "DeFi"}
                value={fa(fmtCompact(globalStats.defiMarketCap), lang)}
                accent="#f472b6"
              />
            </div>
            {usingFallback && (
              <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--brand-muted)] bg-amber-500/5 border border-amber-500/20 rounded-md px-2.5 py-1.5">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  {lang === "fa"
                    ? "نمایش داده‌ها از CoinMarketCap (CoinGecko در حالت آماده‌سازی)"
                    : "Showing CoinMarketCap data (CoinGecko is warming up)"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market Overview — sentiment + market breakdown stats */}
      <MarketOverview
        globalStats={globalStats}
        lang={lang}
        fa={fa}
        fmtCompact={fmtCompact}
      />

      {/* Main grid: coin table (left) + sidebar (right) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* LEFT: Coin table */}
          <div className="min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                {/* Skeleton table rows */}
                <div className="hidden md:block rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] overflow-hidden">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--brand-border)]/30">
                      <div className="h-3 w-4 shimmer rounded" />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-5 h-5 rounded-full shimmer" />
                        <div className="h-3 w-20 shimmer rounded" />
                      </div>
                      <div className="h-3 w-16 shimmer rounded ms-auto" />
                      <div className="h-3 w-12 shimmer rounded" />
                      <div className="h-3 w-14 shimmer rounded" />
                      <div className="h-3 w-16 shimmer rounded" />
                    </div>
                  ))}
                </div>
                {/* Mobile skeleton cards */}
                <div className="md:hidden space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
                      <div className="w-5 h-5 rounded-full shimmer" />
                      <div className="w-8 h-8 rounded-full shimmer" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 shimmer rounded" />
                        <div className="h-2 w-12 shimmer rounded" />
                      </div>
                      <div className="space-y-1.5 text-end">
                        <div className="h-3 w-16 shimmer rounded" />
                        <div className="h-2 w-10 shimmer rounded" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center text-xs text-[var(--brand-muted)] py-2">
                  {lang === "fa" ? "در حال بارگذاری داده‌های بازار..." : "Loading market data..."}
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-sm text-[var(--brand-text)]">{error instanceof Error ? error.message : "Error"}</p>
                <button onClick={() => refetch()} className="px-4 py-2 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110">
                  {lang === "fa" ? "تلاش مجدد" : "Retry"}
                </button>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                {showWatchlistOnly ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] flex items-center justify-center">
                      <Star className="w-7 h-7 text-[var(--brand-muted)] opacity-50" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[var(--brand-text)]">{lang === "fa" ? "واچ‌لیست خالی است" : "Watchlist is empty"}</p>
                      <p className="text-xs text-[var(--brand-muted)] mt-1">{lang === "fa" ? "روی آیکن ستاره هر ارز بزن تا اینجا اضافه شود" : "Tap the star icon on any coin to add it here"}</p>
                    </div>
                    <button onClick={() => setMarketShowWatchlistOnly(false)} className="px-4 py-2 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110 transition-all">
                      {lang === "fa" ? "نمایش همه ارزها" : "Show all coins"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] flex items-center justify-center">
                      <Search className="w-7 h-7 text-[var(--brand-muted)] opacity-50" />
                    </div>
                    <p className="text-sm text-[var(--brand-muted)]">{lang === "fa" ? "ارزی یافت نشد" : "No coins found"}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--brand-border)] bg-[var(--brand-surface-2)]/50">
                        <SortHeader label="#" field="market_cap_rank" sortField={sortField} sortDir={sortDir} onSort={onSort} align="start" />
                        <th className="px-3 py-2 text-start font-bold text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "نام" : "Name"}</th>
                        <SortHeader label={lang === "fa" ? "قیمت" : "Price"} field="current_price" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <SortHeader label="24h %" field="price_change_percentage_24h" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <th className="px-3 py-2 text-end font-bold text-[var(--brand-muted)] uppercase tracking-wider hidden lg:table-cell">7d</th>
                        <SortHeader label="30d %" field="price_change_percentage_30d_in_currency" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <SortHeader label={lang === "fa" ? "حجم" : "Volume"} field="total_volume" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <SortHeader label={lang === "fa" ? "مارکت کپ" : "M.Cap"} field="market_cap" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <th className="px-3 py-2 text-end font-bold text-[var(--brand-muted)] uppercase tracking-wider hidden xl:table-cell">{lang === "fa" ? "تسلط" : "Dom"}</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                      {sorted.map((coin, idx) => {
                        const change = coin.price_change_percentage_24h || 0;
                        const up = change >= 0;
                        const change30d = coin.price_change_percentage_30d_in_currency;
                        const up30d = (change30d ?? 0) >= 0;
                        const isHot = Math.abs(change) >= 5;
                        const isWatchedCoin = watchHydrated && isWatched(coin.id);
                        return (
                          <motion.tr
                            key={coin.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, delay: Math.min(idx * 0.01, 0.2) }}
                            onClick={() => onCoinClick(coin)}
                            className={cn(
                              "border-b border-[var(--brand-border)]/50 cursor-pointer hover:bg-[var(--brand-accent)]/[0.04] transition-colors group",
                              up && "bg-[var(--brand-accent)]/[0.015]",
                              !up && "bg-red-500/[0.015]",
                              isWatchedCoin && "border-l-2 border-l-[var(--brand-accent)]"
                            )}
                          >
                            <td className="px-3 py-2.5 text-start">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[var(--brand-muted)] font-latin">{fa(coin.market_cap_rank || "-", lang)}</span>
                                {isHot && (
                                  <span className="text-[8px] font-latin font-bold px-1 py-0.5 rounded-full bg-orange-500/15 text-orange-400" title={lang === "fa" ? "بازار پرنوسان" : "Volatile"}>🔥</span>
                                )}
                                {watchHydrated && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleWatch(coin.id); }}
                                    className={cn(
                                      "shrink-0 transition-colors",
                                      isWatchedCoin ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--brand-accent)]"
                                    )}
                                    aria-label={isWatchedCoin ? "Remove from watchlist" : "Add to watchlist"}
                                  >
                                    <Star className={cn("w-3 h-3", isWatchedCoin && "fill-current")} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {coin.image && <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full shrink-0" loading="lazy" />}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors truncate">{coin.name}</span>
                                    {coin.tags && coin.tags.length > 0 && (
                                      <span className="text-[8px] font-latin font-bold px-1 py-0.5 rounded bg-[var(--brand-surface-2)] text-[var(--brand-muted)] hidden xl:inline">
                                        {coin.tags.find(t => ["mineable","pow","pos","stablecoin","defi","layer-1"].includes(t)) || coin.tags[0]}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[var(--brand-muted)] font-latin uppercase">{coin.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-text)]">
                              {fa(fmtPrice(coin.current_price), lang)}
                            </td>
                            <td className={cn("px-3 py-2.5 text-end font-latin tabular-nums font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
                              {up ? "▲" : "▼"} {fa(Math.abs(change).toFixed(1), lang)}%
                            </td>
                            <td className="px-3 py-2.5 text-end hidden lg:table-cell">
                              <MiniTrend
                                change1h={coin.price_change_percentage_1h_in_currency}
                                change24h={change}
                                change7d={coin.price_change_percentage_7d_in_currency}
                              />
                            </td>
                            <td className={cn("px-3 py-2.5 text-end font-latin tabular-nums font-bold", up30d ? "text-[var(--brand-accent)]" : "text-red-400")}>
                              {change30d != null ? `${up30d ? "+" : ""}${fa(change30d.toFixed(1), lang)}%` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-muted)]">{fa(fmtCompact(coin.total_volume), lang)}</td>
                            <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-muted)]">{fa(fmtCompact(coin.market_cap), lang)}</td>
                            <td className="px-3 py-2.5 text-end hidden xl:table-cell">
                              {coin.dominance ? (
                                <span className="font-latin tabular-nums text-[var(--brand-muted)]" title={`${coin.name} dominance`}>
                                  {fa(coin.dominance.toFixed(1), lang)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-end"><ExternalLink className="w-3.5 h-3.5 text-[var(--brand-muted)] opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                          </motion.tr>
                        );
                      })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                {/* Mobile: cards */}
                <div className="md:hidden space-y-2">
                  <AnimatePresence mode="popLayout">
                  {sorted.map((coin, idx) => {
                    const change = coin.price_change_percentage_24h || 0;
                    const up = change >= 0;
                    const change1h = coin.price_change_percentage_1h_in_currency;
                    const change7d = coin.price_change_percentage_7d_in_currency;
                    return (
                      <motion.div
                        key={coin.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.01, 0.2) }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border bg-[var(--brand-surface)] transition-colors",
                          up
                            ? "border-[var(--brand-accent)]/15 hover:border-[var(--brand-accent)]/40"
                            : "border-red-500/15 hover:border-red-500/40"
                        )}
                      >
                        <button onClick={() => onCoinClick(coin)} className="flex items-center gap-3 flex-1 min-w-0 text-start">
                          <span className="text-[10px] font-latin text-[var(--brand-muted)] w-5 text-center shrink-0">{fa(coin.market_cap_rank || "-", lang)}</span>
                          {coin.image && <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shrink-0 ring-1 ring-[var(--brand-border)]" loading="lazy" />}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-[var(--brand-text)] truncate">{coin.name}</div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-[10px] text-[var(--brand-muted)] font-latin uppercase">{coin.symbol}</div>
                              {coin.tags && coin.tags.length > 0 && (
                                <span className="text-[8px] font-latin font-bold px-1 py-0.5 rounded bg-[var(--brand-surface-2)] text-[var(--brand-muted)]">
                                  {coin.tags.find(t => ["mineable","pow","pos","stablecoin","defi","layer-1"].includes(t)) || coin.tags[0]}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* MiniTrend — adds a 3-point trend sparkline to mobile cards.
                              Zero API cost: uses 1h/24h/7d changes already in the row. */}
                          <MiniTrend
                            change1h={change1h}
                            change24h={change}
                            change7d={change7d}
                          />
                          <div className="text-end shrink-0">
                            <div className="font-latin tabular-nums text-sm font-bold text-[var(--brand-text)]">{fa(fmtPrice(coin.current_price), lang)}</div>
                            <div className={cn("font-latin tabular-nums text-[10px] font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>{up ? "+" : ""}{fa(change.toFixed(2), lang)}%</div>
                          </div>
                        </button>
                        {watchHydrated && (
                          <button
                            onClick={() => toggleWatch(coin.id)}
                            className={cn(
                              "p-1 rounded-full shrink-0 transition-colors",
                              isWatched(coin.id) ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)] hover:text-[var(--brand-accent)]"
                            )}
                            aria-label={isWatched(coin.id) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className={cn("w-4 h-4", isWatched(coin.id) && "fill-current")} />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-32">
            {/* Trending */}
            {trendingData?.coins && trendingData.coins.length > 0 && (
              <SidebarCard
                title={lang === "fa" ? "داغ‌ترین‌ها" : "Trending"}
                icon={<Flame className="w-3.5 h-3.5" />}
                accent="#f97316"
              >
                <div className="space-y-1">
                  {trendingData.coins.slice(0, 7).map((coin, i) => (
                    <button
                      key={coin.id}
                      onClick={() => router.push(`/crypto/market/${coin.id}`)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-all text-start group border border-transparent hover:border-[var(--brand-accent)]/20"
                    >
                      <span className={cn(
                        "text-[10px] font-latin font-bold w-5 h-5 flex items-center justify-center rounded-md shrink-0",
                        i === 0 ? "bg-orange-500/20 text-orange-400" :
                        i === 1 ? "bg-amber-500/20 text-amber-400" :
                        i === 2 ? "bg-yellow-500/20 text-yellow-400" :
                        "text-[var(--brand-muted)] bg-[var(--brand-surface-2)]"
                      )}>{fa(i + 1, lang)}</span>
                      {coin.thumb && <img src={coin.thumb} alt={coin.name} className="w-5 h-5 rounded-full shrink-0 ring-1 ring-[var(--brand-border)]" loading="lazy" />}
                      <span className="text-xs font-bold text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors truncate flex-1">{coin.name}</span>
                      <span className="text-[9px] font-latin text-[var(--brand-muted)] shrink-0 uppercase tracking-wide">{coin.symbol}</span>
                      {coin.marketCapRank && (
                        <span className="text-[9px] font-latin text-[var(--brand-muted)]/60 shrink-0">#{coin.marketCapRank}</span>
                      )}
                    </button>
                  ))}
                </div>
              </SidebarCard>
            )}

            {/* Altcoin Season section removed — the API was non-essential
                and added 1 extra request per page load. The market page
                now focuses on the most important data: top coins, trending,
                top gainers, global stats, and Fear & Greed. */}

            {/* Fear & Greed Historical Chart */}
            {fngHistory?.data && fngHistory.data.length > 0 && (
              <SidebarCard
                title={lang === "fa" ? "شاخص ترس و طمع (۳۰ روز)" : "Fear & Greed (30d)"}
                icon={<Activity className="w-3.5 h-3.5" />}
                accent="#2dd4bf"
              >
                <FngChart data={fngHistory.data} lang={lang} />
              </SidebarCard>
            )}

            {/* Top Gainers (24h) */}
            {topGainersData?.coins && topGainersData.coins.length > 0 && (
              <SidebarCard
                title={lang === "fa" ? "بزرگترین صعودی‌ها (۲۴س)" : "Top Gainers (24h)"}
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                accent="#22c55e"
              >
                <div className="space-y-1">
                  {topGainersData.coins.slice(0, 7).map((coin, i) => (
                    <button
                      key={coin.id}
                      onClick={() => router.push(`/crypto/market/${coin.slug || coin.symbol.toLowerCase()}`)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-all text-start group border border-transparent hover:border-emerald-500/20"
                    >
                      <span className="text-[10px] font-latin font-bold w-5 h-5 flex items-center justify-center rounded-md shrink-0 bg-emerald-500/10 text-emerald-400">
                        {fa(i + 1, lang)}
                      </span>
                      <img
                        src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`}
                        alt={coin.name}
                        className="w-5 h-5 rounded-full shrink-0 ring-1 ring-[var(--brand-border)]"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[var(--brand-text)] group-hover:text-emerald-400 transition-colors truncate">
                          {coin.name}
                        </div>
                        <div className="text-[9px] font-latin text-[var(--brand-muted)] uppercase tracking-wide">
                          {coin.symbol}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="text-[10px] font-latin font-bold text-emerald-400">
                          +{fa(coin.percentChange24h.toFixed(2), lang)}%
                        </div>
                        <div className="text-[9px] font-latin text-[var(--brand-muted)]/70">
                          {fa(fmtPrice(coin.price), lang)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </SidebarCard>
            )}

            {/* Hot Coins — trending coins that are also top gainers */}
            {trendingData?.coins && topGainersData?.coins && (() => {
              const gainerSlugs = new Set(topGainersData.coins.map(c => c.slug || c.symbol.toLowerCase()));
              const hotCoins = trendingData.coins.filter(c => {
                const slug = c.id || c.symbol.toLowerCase();
                return gainerSlugs.has(slug) || gainerSlugs.has(c.symbol.toLowerCase());
              }).slice(0, 5);
              if (hotCoins.length === 0) return null;
              return (
                <SidebarCard
                  title={lang === "fa" ? "کوین‌های داغ 🔥" : "Hot Coins 🔥"}
                  icon={<Flame className="w-3.5 h-3.5" />}
                  accent="#ef4444"
                >
                  <div className="space-y-1">
                    {hotCoins.map((coin, i) => {
                      const gainer = topGainersData.coins.find(
                        g => (g.slug || g.symbol.toLowerCase()) === (coin.id || coin.symbol.toLowerCase())
                          || g.symbol.toLowerCase() === coin.symbol.toLowerCase()
                      );
                      return (
                        <button
                          key={coin.id}
                          onClick={() => router.push(`/crypto/market/${coin.id}`)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-all text-start group border border-transparent hover:border-red-500/20"
                        >
                          <span className="text-[10px] font-latin font-bold w-5 h-5 flex items-center justify-center rounded-md shrink-0 bg-red-500/10 text-red-400">
                            🔥
                          </span>
                          {coin.thumb && (
                            <img
                              src={coin.thumb}
                              alt={coin.name}
                              className="w-5 h-5 rounded-full shrink-0 ring-1 ring-[var(--brand-border)]"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[var(--brand-text)] group-hover:text-red-400 transition-colors truncate">
                              {coin.name}
                            </div>
                            <div className="text-[9px] font-latin text-[var(--brand-muted)] uppercase tracking-wide">
                              {coin.symbol}
                            </div>
                          </div>
                          {gainer && (
                            <div className="text-end shrink-0">
                              <div className="text-[10px] font-latin font-bold text-emerald-400">
                                +{fa(gainer.percentChange24h.toFixed(1), lang)}%
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </SidebarCard>
              );
            })()}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ============= Sub Components ============= */

function StatPill({ label, value, change, accent }: { label: string; value: string; change?: number; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[var(--brand-muted)] uppercase tracking-wider font-latin">{label}</span>
      <span className="font-latin tabular-nums font-bold" style={{ color: accent || "var(--brand-text)" }}>{value}</span>
      {change !== undefined && (
        <span className={cn("text-[10px] font-latin", change >= 0 ? "text-[var(--brand-accent)]" : "text-red-400")}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function SortHeader({ label, field, sortField, sortDir, onSort, align }: { label: string; field: SortField; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void; align: "start" | "end" }) {
  const isActive = field === sortField;
  return (
    <th className={cn("px-3 py-2", align === "end" ? "text-end" : "text-start")}>
      <button onClick={() => onSort(field)} className={cn("inline-flex items-center gap-1 font-bold uppercase tracking-wider transition-colors", isActive ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]")}>
        {label}
        {isActive ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    </th>
  );
}

function SidebarCard({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <GlassCard accent={accent} className="p-4 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-latin font-semibold mb-3" style={{ color: accent }}>
        {icon}
        <span>{title}</span>
      </div>
      <div>{children}</div>
    </GlassCard>
  );
}

// AltcoinSeasonGauge removed — the API was non-essential.

function FngChart({ data, lang }: { data: Array<{ value: number; classification: string; date: string }>; lang: "fa" | "en" }) {
  const reversed = [...data].reverse(); // oldest first
  const width = 280;
  const height = 80;
  const min = 0;
  const max = 100;
  const points = reversed.map((d, i) => {
    const x = (i / (reversed.length - 1)) * width;
    const y = height - ((d.value - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(" ");

  const fngColor = (v: number) => v <= 25 ? "#ef4444" : v <= 45 ? "#f97316" : v <= 55 ? "#eab308" : v <= 75 ? "#84cc16" : "#22c55e";
  const latest = reversed[reversed.length - 1];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold font-latin" style={{ color: fngColor(latest.value) }}>{fa(latest.value, lang)}</span>
        <span className="text-xs font-bold" style={{ color: fngColor(latest.value) }}>{latest.classification}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fng-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#fng-grad)" stroke="none" />
        <polyline points={points} fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/* ============= Market Overview (Phase 22) ============= */
/**
 * Minimal market overview section — sits between the stats bar and the
 * coin table. Shows a brief market summary with:
 *  - Market sentiment (bullish/bearish/neutral) based on 24h change
 *  - Top gainer highlight (single coin)
 *  - Trending coin highlight (single coin)
 *  - BTC dominance progress bar
 *
 * Design: minimal, no blur, no gradients. Solid surfaces with accent colors.
 */
function MarketOverview({
  globalStats,
  lang,
  fa,
  fmtCompact,
}: {
  globalStats: GlobalStats | undefined;
  lang: "fa" | "en";
  fa: (n: string | number, lang: "fa" | "en") => string;
  fmtCompact: (n: number) => string;
}) {
  if (!globalStats) return null;

  const change = globalStats.totalMarketCapYesterdayPctChange || 0;
  const isBullish = change > 1;
  const isBearish = change < -1;
  const sentiment = isBullish
    ? { label: lang === "fa" ? "صعودی" : "Bullish", color: "#2dd4bf", icon: "▲" }
    : isBearish
    ? { label: lang === "fa" ? "نزولی" : "Bearish", color: "#f87171", icon: "▼" }
    : { label: lang === "fa" ? "خنثی" : "Neutral", color: "#a78bfa", icon: "●" };

  return (
    <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        {/* Sentiment + key stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {/* Sentiment */}
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
              {lang === "fa" ? "احساس بازار" : "Sentiment"}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: sentiment.color }}>
                {sentiment.icon}
              </span>
              <span className="text-sm font-bold" style={{ color: sentiment.color }}>
                {sentiment.label}
              </span>
              <span className="text-[10px] text-[var(--brand-muted)] font-latin">
                {change >= 0 ? "+" : ""}{fa(change.toFixed(1), lang)}%
              </span>
            </div>
          </div>
          {/* Total Market Cap */}
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
              {lang === "fa" ? "مارکت کپ کل" : "Total M.Cap"}
            </div>
            <div className="text-sm font-bold text-[var(--brand-text)] font-latin tabular-nums">
              {fa(fmtCompact(globalStats.totalMarketCap), lang)}
            </div>
          </div>
          {/* 24h Volume */}
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
              {lang === "fa" ? "حجم ۲۴س" : "24h Volume"}
            </div>
            <div className="text-sm font-bold text-[var(--brand-text)] font-latin tabular-nums">
              {fa(fmtCompact(globalStats.totalVolume24h), lang)}
            </div>
          </div>
          {/* Active Coins */}
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
              {lang === "fa" ? "ارزهای فعال" : "Active Coins"}
            </div>
            <div className="text-sm font-bold text-[var(--brand-text)] font-latin tabular-nums">
              {fa(globalStats.activeCryptoCurrencies.toLocaleString(), lang)}
            </div>
          </div>
        </div>

        {/* BTC + ETH dominance bars */}
        {globalStats.btcDominance > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-[var(--brand-muted)] font-latin uppercase tracking-wider shrink-0 w-12">BTC</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--brand-surface-2)] overflow-hidden">
                <div className="h-full rounded-full bg-[#f7931a]" style={{ width: `${globalStats.btcDominance}%` }} />
              </div>
              <span className="font-latin font-bold text-[#f7931a] tabular-nums shrink-0">{fa(globalStats.btcDominance.toFixed(1), lang)}%</span>
            </div>
            {globalStats.ethDominance > 0 && (
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[var(--brand-muted)] font-latin uppercase tracking-wider shrink-0 w-12">ETH</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--brand-surface-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-[#627eea]" style={{ width: `${globalStats.ethDominance * 5}%` }} />
                </div>
                <span className="font-latin font-bold text-[#627eea] tabular-nums shrink-0">{fa(globalStats.ethDominance.toFixed(1), lang)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Market breakdown mini-stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[10px]">
          <div className="p-1.5 rounded-lg bg-[var(--brand-surface-2)]/50">
            <div className="text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "آلت‌کوین" : "Altcoins"}</div>
            <div className="font-latin font-bold text-[var(--brand-text)] tabular-nums">{fa(fmtCompact(globalStats.altcoinMarketCap || 0), lang)}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-surface-2)]/50">
            <div className="text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "دیفای" : "DeFi"}</div>
            <div className="font-latin font-bold text-[var(--brand-text)] tabular-nums">{fa(fmtCompact(globalStats.defiMarketCap), lang)}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-surface-2)]/50">
            <div className="text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "استیبل" : "Stable"}</div>
            <div className="font-latin font-bold text-[var(--brand-text)] tabular-nums">{fa(fmtCompact(globalStats.stablecoinMarketCap), lang)}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-surface-2)]/50">
            <div className="text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "مشتقات" : "Derivatives"}</div>
            <div className="font-latin font-bold text-[var(--brand-text)] tabular-nums">{fa(fmtCompact(globalStats.derivativesVolume24h || 0), lang)}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-surface-2)]/50">
            <div className="text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "صرافی‌ها" : "Exchanges"}</div>
            <div className="font-latin font-bold text-[var(--brand-text)] tabular-nums">{fa(globalStats.activeExchanges.toLocaleString(), lang)}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-surface-2)]/50">
            <div className="text-[var(--brand-muted)] uppercase tracking-wider">{lang === "fa" ? "جفت‌ها" : "Pairs"}</div>
            <div className="font-latin font-bold text-[var(--brand-text)] tabular-nums">{fa((globalStats.activeMarketPairs || 0).toLocaleString(), lang)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============= MiniTrend — 3-point trend indicator ============= */
/**
 * Shows a tiny inline SVG trend line from 1h, 24h, 7d change percentages.
 * No API calls — uses data already fetched in the market table.
 * The line goes from left (1h ago) to right (7d ago), showing the
 * direction of price movement over the past week.
 */
function MiniTrend({
  change1h,
  change24h,
  change7d,
}: {
  change1h?: number;
  change24h: number;
  change7d?: number;
}) {
  // Build 3 data points: 7d → 24h → 1h (chronological order)
  // If a value is missing, use 0 (flat)
  const points = [
    change7d ?? 0,
    change24h ?? 0,
    change1h ?? 0,
  ];
  const width = 48;
  const height = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  // Color: green if 24h change is positive, red if negative
  const color = change24h >= 0 ? "#2dd4bf" : "#f87171";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block align-middle" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dot at the end (current state) */}
      <circle cx={width} cy={height - ((points[points.length - 1] - min) / range) * height} r="1.5" fill={color} />
    </svg>
  );
}
