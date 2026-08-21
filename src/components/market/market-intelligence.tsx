"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useUIStore } from "@/hooks/use-ui-store";
import { GlassCard, Badge } from "./ui-primitives";
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

type SortField = "market_cap_rank" | "current_price" | "price_change_percentage_24h" | "price_change_percentage_7d_in_currency" | "total_volume" | "market_cap" | "price_change_percentage_30d_in_currency";
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
      .map(([tag, count]) => ({ tag, count }));
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

  const onCoinClick = useCallback((coin: Coin) => router.push(`/crypto/market/${coin.id}`), [router]);

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
              <Search className="absolute start-3 w-3.5 h-3.5 text-[var(--brand-muted)] pointer-events-none group-focus-within:text-[var(--brand-accent)] transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی ارز..." : "Search..."}
                className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full ps-9 pe-3 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20 w-32 sm:w-48 transition-all"
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
        {/* Category tags filter bar — with horizontal scroll arrows */}
        {availableTags.length > 0 && (
          <TagFilterBar
            tags={availableTags}
            activeTag={activeTag}
            onSelectTag={setMarketActiveTag}
            totalCoins={coins.length}
            lang={lang}
            fa={fa}
          />
        )}
      </div>

      {/* Market Pulse — single unified market overview section.
          Consolidates: sentiment, market cap, 24h volume, dominance,
          and market breakdown into ONE place. No duplication with the
          top stats bar above (which was removed in favour of this). */}
      <MarketPulse
        globalStats={globalStats}
        cmcCoins={cmcData?.coins}
        lang={lang}
        fa={fa}
        fmtCompact={fmtCompact}
        usingFallback={usingFallback}
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
                        <SortHeader label="7d %" field="price_change_percentage_7d_in_currency" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
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
                        const change7d = coin.price_change_percentage_7d_in_currency;
                        const up7d = (change7d ?? 0) >= 0;
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
                              isWatchedCoin && "border-s-2 border-s-[var(--brand-accent)]"
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
                            <td className={cn("px-3 py-2.5 text-end font-latin tabular-nums font-bold", up7d ? "text-[var(--brand-accent)]" : "text-red-400")}>
                              {change7d != null ? `${up7d ? "+" : ""}${fa(change7d.toFixed(1), lang)}%` : "—"}
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

/**
 * TagFilterBar — horizontal scrollable filter with arrow buttons.
 *
 * UX improvements over a bare overflow-x-auto div:
 *  - Left/right arrow buttons appear when there's overflow.
 *  - Arrows are positioned absolutely so they don't push tags.
 *  - Arrow buttons fade out when at start/end of scroll.
 *  - Smooth scroll animation (300ms).
 *  - Edge fade gradients on left/right (subtle visual hint).
 *
 * The arrows use ChevronLeft/ChevronRight which automatically flip
 * in RTL mode (the icons point in the reading direction).
 */
function TagFilterBar({
  tags,
  activeTag,
  onSelectTag,
  totalCoins,
  lang,
  fa,
}: {
  tags: { tag: string; count: number }[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  totalCoins: number;
  lang: "fa" | "en";
  fa: (n: string | number, lang: "fa" | "en") => string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // In RTL, scrollLeft is negative or works differently across browsers.
    // Using scrollWidth + scrollLeft + clientWidth handles both cases.
    const maxScroll = el.scrollWidth - el.clientWidth;
    const current = Math.abs(el.scrollLeft);
    setCanScrollStart(current > 8);
    setCanScrollEnd(current < maxScroll - 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    // Re-check on resize (window or container size changes)
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(checkScroll)
      : null;
    if (ro) ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      if (ro) ro.disconnect();
    };
  }, [checkScroll, tags.length]);

  // Scroll by ~200px in the appropriate direction.
  // In RTL, "left" button scrolls toward higher index (which is visually left).
  // scrollLeft: -delta works in both LTR (negative goes left) and RTL
  // (positive goes left visually but is "forward" reading-wise).
  const scrollByDir = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = 220;
    // For RTL languages (Persian), the visual direction is flipped:
    //   "prev" (ChevronLeft in LTR) should scroll toward end-1 in RTL.
    // We detect RTL via the parent element's dir attribute or lang.
    const isRTL = lang === "fa";
    const effectiveDelta = (dir === "prev") ? -delta : delta;
    el.scrollBy({ left: isRTL ? -effectiveDelta : effectiveDelta, behavior: "smooth" });
  };

  return (
    <div className="border-t border-[var(--brand-border)]/50 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
        <div className="relative">
          {/* Left edge fade + arrow button (only visible when can scroll) */}
          {canScrollStart && (
            <>
              <div className="absolute inset-y-0 start-0 w-8 bg-gradient-to-r from-[var(--brand-bg)] to-transparent pointer-events-none z-10" />
              <button
                onClick={() => scrollByDir("prev")}
                className="absolute start-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors shadow-sm"
                aria-label={lang === "fa" ? "اسکرول به راست" : "Scroll left"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
            <button
              onClick={() => onSelectTag(null)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
                !activeTag
                  ? "bg-[var(--brand-accent)] text-[#04201d]"
                  : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              )}
            >
              {lang === "fa" ? "همه" : "All"}
              <span className={cn(
                "min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full text-[9px] font-latin",
                !activeTag ? "bg-[#04201d]/20 text-[#04201d]" : "bg-[var(--brand-surface-2)] text-[var(--brand-muted)]"
              )}>
                {fa(totalCoins, lang)}
              </span>
            </button>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => onSelectTag(activeTag === tag ? null : tag)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap capitalize",
                  activeTag === tag
                    ? "bg-[var(--brand-accent)] text-[#04201d]"
                    : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30"
                )}
              >
                {tag.replace(/-/g, " ")}
                <span className={cn(
                  "min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full text-[9px] font-latin",
                  activeTag === tag ? "bg-[#04201d]/20 text-[#04201d]" : "bg-[var(--brand-surface-2)] text-[var(--brand-muted)]"
                )}>
                  {fa(count, lang)}
                </span>
              </button>
            ))}
          </div>

          {/* Right edge fade + arrow button */}
          {canScrollEnd && (
            <>
              <div className="absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-[var(--brand-bg)] to-transparent pointer-events-none z-10" />
              <button
                onClick={() => scrollByDir("next")}
                className="absolute end-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors shadow-sm"
                aria-label={lang === "fa" ? "اسکرول به چپ" : "Scroll right"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
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

/* ============= Market Pulse (Phase 29 — unified overview) ============= */
/**
 * Single unified market overview — replaces the old Stats Bar + MarketOverview
 * pair that showed 6 duplicate data points between them.
 *
 * Layout:
 *   ┌───────────────┬───────────────┬───────────────┐
 *   │  Sentiment    │  Market Cap   │  24h Volume   │  (3 hero stats — no dup)
 *   │  (with icon   │  (with %      │               │
 *   │   + label)    │   change)     │               │
 *   ├───────────────┴───────────────┴───────────────┤
 *   │  Dominance donut  │  Breakdown grid (6 mini)  │  (donut uses BTC/ETH/Alt)
 *   │  (SVG, zero deps) │  (Alt, DeFi, Stable, etc) │
 *   └────────────────────┴──────────────────────────┘
 *
 * Zero API cost — uses data already fetched by the parent component.
 */
function MarketPulse({
  globalStats,
  cmcCoins,
  lang,
  fa,
  fmtCompact,
  usingFallback,
}: {
  globalStats: GlobalStats | undefined;
  cmcCoins: CmcCoin[] | undefined;
  lang: "fa" | "en";
  fa: (n: string | number, lang: "fa" | "en") => string;
  fmtCompact: (n: number) => string;
  usingFallback: boolean;
}) {
  // Loading skeleton — mirrors the layout so the transition to loaded
  // data is smooth (no layout shift). Donut placeholders with proper
  // sizes prevent the page from jumping when data arrives.
  if (!globalStats || globalStats.totalMarketCap <= 0) {
    return (
      <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          {/* Row 1 skeleton — 3 hero stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] space-y-2">
                <div className="h-3 w-16 rounded shimmer" />
                <div className="h-5 w-24 rounded shimmer" />
                <div className="h-3 w-12 rounded shimmer" />
              </div>
            ))}
          </div>
          {/* Row 2 skeleton — donut + breakdown grid */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
              <div className="w-20 h-20 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-12 rounded shimmer" />
                <div className="h-3 w-12 rounded shimmer" />
                <div className="h-3 w-12 rounded shimmer" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-2 rounded-lg bg-[var(--brand-surface-2)]/40 border border-[var(--brand-border)]/30 space-y-1.5">
                  <div className="h-3 w-14 rounded shimmer" />
                  <div className="h-4 w-20 rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const change = globalStats.totalMarketCapYesterdayPctChange || 0;
  const isBullish = change > 1;
  const isBearish = change < -1;
  const sentiment = isBullish
    ? { label: lang === "fa" ? "صعودی" : "Bullish", color: "#2dd4bf", icon: "▲" }
    : isBearish
    ? { label: lang === "fa" ? "نزولی" : "Bearish", color: "#f87171", icon: "▼" }
    : { label: lang === "fa" ? "خنثی" : "Neutral", color: "#a78bfa", icon: "●" };

  // Donut chart math — BTC, ETH, Others segments.
  // Uses absolute dominance %, not the buggy `* 5` scaling factor.
  const btcDom = globalStats.btcDominance || 0;
  const ethDom = globalStats.ethDominance || 0;
  const othersDom = Math.max(0, 100 - btcDom - ethDom);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const btcArc = (btcDom / 100) * circumference;
  const ethArc = (ethDom / 100) * circumference;
  const othersArc = (othersDom / 100) * circumference;

  return (
    <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        {/* Row 1 — three hero stats (no duplication with the row below) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
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
            </div>
            <div className="text-[10px] text-[var(--brand-muted)] font-latin tabular-nums mt-0.5">
              {change >= 0 ? "+" : ""}{fa(change.toFixed(2), lang)}% {lang === "fa" ? "۲۴س" : "24h"}
            </div>
          </div>
          {/* Total Market Cap */}
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
              {lang === "fa" ? "مارکت کپ کل" : "Total Market Cap"}
            </div>
            <div className="text-sm md:text-base font-bold text-[var(--brand-text)] font-latin tabular-nums">
              {fa(fmtCompact(globalStats.totalMarketCap), lang)}
            </div>
            {change !== 0 && (
              <div className={cn(
                "text-[10px] font-latin tabular-nums font-bold mt-0.5",
                change >= 0 ? "text-[var(--brand-accent)]" : "text-red-400"
              )}>
                {change >= 0 ? "▲" : "▼"} {fa(Math.abs(change).toFixed(2), lang)}%
              </div>
            )}
          </div>
          {/* 24h Volume */}
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1.5">
              {lang === "fa" ? "حجم ۲۴س" : "24h Volume"}
            </div>
            <div className="text-sm md:text-base font-bold text-[var(--brand-text)] font-latin tabular-nums">
              {fa(fmtCompact(globalStats.totalVolume24h), lang)}
            </div>
            <div className="text-[10px] text-[var(--brand-muted)] font-latin mt-0.5">
              {fa((globalStats.activeCryptoCurrencies || 0).toLocaleString(), lang)} {lang === "fa" ? "ارز" : "coins"}
            </div>
          </div>
        </div>

        {/* Row 2 — dominance donut + market breakdown grid */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          {/* Dominance donut chart — proper SVG, no external deps */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
            <div className="relative shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                {/* Track */}
                <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--brand-surface-2)" strokeWidth="7" />
                {/* BTC segment (orange) */}
                {btcArc > 0 && (
                  <circle
                    cx="40" cy="40" r={radius}
                    fill="none" stroke="#f7931a" strokeWidth="7"
                    strokeDasharray={`${btcArc} ${circumference - btcArc}`}
                    strokeDashoffset="0"
                  />
                )}
                {/* ETH segment (blue) */}
                {ethArc > 0 && (
                  <circle
                    cx="40" cy="40" r={radius}
                    fill="none" stroke="#627eea" strokeWidth="7"
                    strokeDasharray={`${ethArc} ${circumference - ethArc}`}
                    strokeDashoffset={-btcArc}
                  />
                )}
                {/* Others segment (muted) */}
                {othersArc > 0 && (
                  <circle
                    cx="40" cy="40" r={radius}
                    fill="none" stroke="var(--brand-muted)" strokeWidth="7"
                    strokeDasharray={`${othersArc} ${circumference - othersArc}`}
                    strokeDashoffset={-(btcArc + ethArc)}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] text-[var(--brand-muted)] font-latin uppercase tracking-wider">
                  {lang === "fa" ? "تسلط" : "Dominance"}
                </span>
                <span className="text-xs font-bold text-[var(--brand-text)] font-latin tabular-nums">
                  {fa(btcDom.toFixed(0), lang)}%
                </span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f7931a] shrink-0" />
                  <span className="font-bold text-[var(--brand-text)]">BTC</span>
                </span>
                <span className="font-latin tabular-nums font-bold text-[#f7931a]">
                  {fa(btcDom.toFixed(2), lang)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#627eea] shrink-0" />
                  <span className="font-bold text-[var(--brand-text)]">ETH</span>
                </span>
                <span className="font-latin tabular-nums font-bold text-[#627eea]">
                  {fa(ethDom.toFixed(2), lang)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--brand-muted)] shrink-0" />
                  <span className="font-bold text-[var(--brand-text)]">{lang === "fa" ? "سایر" : "Others"}</span>
                </span>
                <span className="font-latin tabular-nums text-[var(--brand-muted)]">
                  {fa(othersDom.toFixed(2), lang)}%
                </span>
              </div>
            </div>
          </div>

          {/* Market breakdown — 6 compact mini-stats.
              Each shows a market segment's market cap or volume. */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <BreakdownStat
              label={lang === "fa" ? "آلت‌کوین" : "Altcoins"}
              value={fa(fmtCompact(globalStats.altcoinMarketCap || 0), lang)}
              accent="#a78bfa"
            />
            <BreakdownStat
              label={lang === "fa" ? "دیفای" : "DeFi"}
              value={fa(fmtCompact(globalStats.defiMarketCap), lang)}
              accent="#f472b6"
            />
            <BreakdownStat
              label={lang === "fa" ? "استیبل‌کوین" : "Stablecoins"}
              value={fa(fmtCompact(globalStats.stablecoinMarketCap), lang)}
              accent="#38bdf8"
            />
            <BreakdownStat
              label={lang === "fa" ? "مشتقات" : "Derivatives"}
              value={fa(fmtCompact(globalStats.derivativesVolume24h || 0), lang)}
              accent="#fbbf24"
            />
            {/* Vol/MCap Ratio — market activity indicator.
                High (>10%) = very active trading / high liquidity.
                Low (<5%) = hodling phase / low trading interest.
                Computed from data already fetched. Zero API cost. */}
            <BreakdownStat
              label={lang === "fa" ? "فعالیت بازار" : "Activity"}
              value={`${fa((globalStats.totalVolume24h / globalStats.totalMarketCap * 100).toFixed(1), lang)}%`}
              accent="#34d399"
            />
            {/* Top 10 Concentration — what % of total market cap is in
                the top 10 coins. Computed from cmcCoins data already
                fetched for the table. Zero API cost.
                High (>85%) = market concentrated in BTC/ETH, altseason
                unlikely. Low (<70%) = altcoins have significant share,
                altseason potential. */}
            {(() => {
              const top10 = (cmcCoins || [])
                .slice(0, 10)
                .reduce((sum, c) => sum + (c.marketCap || 0), 0);
              const concentration = globalStats.totalMarketCap > 0
                ? (top10 / globalStats.totalMarketCap) * 100
                : 0;
              return (
                <BreakdownStat
                  label={lang === "fa" ? "تمرکز ۱۰" : "Top 10"}
                  value={`${fa(concentration.toFixed(1), lang)}%`}
                  accent="#fb923c"
                />
              );
            })()}
          </div>
        </div>

        {/* Fallback notice — only shown when CoinGecko is rate-limited
            and we're showing CMC data instead. */}
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
  );
}

/** Compact breakdown stat — used in the Market Pulse grid. */
function BreakdownStat({
  label,
  value,
  accent,
  isCount,
}: {
  label: string;
  value: string;
  accent: string;
  isCount?: boolean;
}) {
  return (
    <div className="p-2 rounded-lg bg-[var(--brand-surface-2)]/40 border border-[var(--brand-border)]/30">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <span className="text-[9px] font-latin uppercase tracking-wider text-[var(--brand-muted)] truncate">
          {label}
        </span>
      </div>
      <div className={cn(
        "text-xs font-bold font-latin tabular-nums text-[var(--brand-text)]",
        isCount && "text-[11px]"
      )}>
        {value}
      </div>
    </div>
  );
}

/* MiniTrend removed — was misleading.
 *
 * The previous MiniTrend component plotted 3 change percentages
 * (7d%, 24h%, 1h%) as a "trend line", but that is NOT a real price
 * chart — it's a visualization of how change percentages vary across
 * timeframes. Users expected an actual 7-day price sparkline, which
 * we don't have without enabling sparkline=true in the CoinGecko
 * markets API call (which would 4x the response size).
 *
 * Replaced with a simple, honest "7d %" column that shows the 7-day
 * percentage change as text, matching the existing "24h %" and "30d %"
 * columns.
 */
