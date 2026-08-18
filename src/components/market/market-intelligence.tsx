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
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  atl: number;
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
  percentChange24h: number;
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
}

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
}

interface AltcoinSeason {
  index: number;
  season: string;
  btcChange24h: number;
  altcoinsCount: number;
  outperformingCount: number;
}

interface FngHistory {
  data: Array<{ value: number; classification: string; timestamp: number; date: string }>;
}

type SortField = "market_cap_rank" | "current_price" | "price_change_percentage_24h" | "total_volume" | "market_cap";
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
  const [sortField, setSortField] = useState<SortField>("market_cap_rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const { watchlist, isWatched, toggle: toggleWatch, hydrated: watchHydrated } = useWatchlist();

  // --- Coin list (top 100) ---
  const { data: marketData, isLoading, error, refetch, isFetching } = useQuery<{ coins: Coin[] }>({
    queryKey: ["market", "coingecko-markets", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/coingecko-markets?per_page=100&sparkline=false", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.rateLimited) throw new Error(lang === "fa" ? "درخواست‌های زیاد. یک دقیقه صبر کنید." : "Rate limited.");
      return json as { coins: Coin[] };
    },
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  // --- CMC listings (for tags/category filter) ---
  // We fetch CMC listings in parallel to get tags for category filtering.
  // This data is edge-cached 60s and TanStack Query caches it 2min.
  // Local-first: no extra upstream call if cache is warm.
  const { data: cmcData } = useQuery<{ coins: CmcCoin[] }>({
    queryKey: ["market", "cmc-listings", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/cmc-listings?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { coins: (json?.coins || []) as CmcCoin[] };
    },
    staleTime: 2 * 60_000,
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
  const { data: globalStats } = useQuery<GlobalStats>({
    queryKey: ["market", "global-stats"],
    queryFn: async () => {
      const res = await fetch("/api/market/global-stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as GlobalStats;
    },
    staleTime: 60_000,
  });

  // --- Trending coins ---
  const { data: trendingData } = useQuery<{ coins: TrendingCoin[] }>({
    queryKey: ["market", "trending"],
    queryFn: async () => {
      const res = await fetch("/api/market/trending", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { coins: TrendingCoin[] };
    },
    staleTime: 5 * 60_000,
  });

  // --- Altcoin Season ---
  const { data: altcoinSeason } = useQuery<AltcoinSeason>({
    queryKey: ["market", "altcoin-season"],
    queryFn: async () => {
      const res = await fetch("/api/market/altcoin-season", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AltcoinSeason;
    },
    staleTime: 5 * 60_000,
  });

  // --- Fear & Greed Historical (30 days) ---
  const { data: fngHistory } = useQuery<FngHistory>({
    queryKey: ["market", "fear-greed-historical", 30],
    queryFn: async () => {
      const res = await fetch("/api/market/fear-greed-historical?days=30", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as FngHistory;
    },
    staleTime: 15 * 60_000,
  });

  const coins = marketData?.coins || [];

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
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "market_cap_rank" ? "asc" : "desc");
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
              <h1 className="font-display text-lg md:text-xl font-bold text-[var(--brand-text)] truncate">
                {lang === "fa" ? "هوش بازار" : "Market Intelligence"}
              </h1>
            </div>
            {/* Watchlist toggle */}
            <button
              onClick={() => setShowWatchlistOnly((v) => !v)}
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
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-[var(--brand-muted)] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی ارز..." : "Search..."}
                className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full pl-9 pr-3 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)] w-32 sm:w-48"
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
                  onClick={() => setActiveTag(null)}
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
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
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

      {/* Global Stats Bar */}
      {globalStats && globalStats.totalMarketCap > 0 && (
        <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <StatPill label={lang === "fa" ? "مارکت کپ کل" : "Total M.Cap"} value={fa(fmtCompact(globalStats.totalMarketCap), lang)}
                change={globalStats.totalMarketCapYesterdayPctChange} />
              <StatPill label={lang === "fa" ? "حجم ۲۴س" : "24h Volume"} value={fa(fmtCompact(globalStats.totalVolume24h), lang)} />
              <StatPill label="BTC" value={`${fa(globalStats.btcDominance.toFixed(1), lang)}%`} accent="#f7931a" />
              <StatPill label="ETH" value={`${fa(globalStats.ethDominance.toFixed(1), lang)}%`} accent="#627eea" />
              <StatPill label={lang === "fa" ? "ارزها" : "Coins"} value={fa(globalStats.activeCryptoCurrencies.toLocaleString(), lang)} />
              <StatPill label={lang === "fa" ? "دیفای" : "DeFi"} value={fa(fmtCompact(globalStats.defiMarketCap), lang)} />
            </div>
          </div>
        </div>
      )}

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
                    <button onClick={() => setShowWatchlistOnly(false)} className="px-4 py-2 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110 transition-all">
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
                        <SortHeader label={lang === "fa" ? "حجم" : "Volume"} field="total_volume" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <SortHeader label={lang === "fa" ? "مارکت کپ" : "M.Cap"} field="market_cap" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                      {sorted.map((coin, idx) => {
                        const change = coin.price_change_percentage_24h || 0;
                        const up = change >= 0;
                        return (
                          <motion.tr
                            key={coin.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.3) }}
                            whileHover={{ backgroundColor: "rgba(45, 212, 191, 0.05)" }}
                            onClick={() => onCoinClick(coin)}
                            className="border-b border-[var(--brand-border)]/50 cursor-pointer transition-colors group"
                          >
                            <td className="px-3 py-2.5 text-start">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[var(--brand-muted)] font-latin">{fa(coin.market_cap_rank || "-", lang)}</span>
                                {watchHydrated && (
                                  <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={(e) => { e.stopPropagation(); toggleWatch(coin.id); }}
                                    className={cn(
                                      "shrink-0 transition-colors",
                                      isWatched(coin.id) ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--brand-accent)]"
                                    )}
                                    aria-label={isWatched(coin.id) ? "Remove from watchlist" : "Add to watchlist"}
                                  >
                                    <Star className={cn("w-3 h-3", isWatched(coin.id) && "fill-current")} />
                                  </motion.button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {coin.image && <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full shrink-0" loading="lazy" />}
                                <div className="min-w-0">
                                  <div className="font-bold text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors truncate">{coin.name}</div>
                                  <div className="text-[10px] text-[var(--brand-muted)] font-latin uppercase">{coin.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-text)]">{fa(fmtPrice(coin.current_price), lang)}</td>
                            <td className={cn("px-3 py-2.5 text-end font-latin tabular-nums font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
                              {up ? "+" : ""}{fa(change.toFixed(2), lang)}%
                            </td>
                            <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-muted)]">{fa(fmtCompact(coin.total_volume), lang)}</td>
                            <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-muted)]">{fa(fmtCompact(coin.market_cap), lang)}</td>
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
                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.4) }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] hover:border-[var(--brand-accent)]/40 transition-colors"
                      >
                        <button onClick={() => onCoinClick(coin)} className="flex items-center gap-3 flex-1 min-w-0 text-start">
                          <span className="text-[10px] font-latin text-[var(--brand-muted)] w-5 text-center shrink-0">{fa(coin.market_cap_rank || "-", lang)}</span>
                          {coin.image && <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shrink-0" loading="lazy" />}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-[var(--brand-text)] truncate">{coin.name}</div>
                            <div className="text-[10px] text-[var(--brand-muted)] font-latin uppercase">{coin.symbol}</div>
                          </div>
                          <div className="text-end shrink-0">
                            <div className="font-latin tabular-nums text-sm font-bold text-[var(--brand-text)]">{fa(fmtPrice(coin.current_price), lang)}</div>
                            <div className={cn("font-latin tabular-nums text-[10px] font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>{up ? "+" : ""}{fa(change.toFixed(2), lang)}%</div>
                          </div>
                        </button>
                        {watchHydrated && (
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => toggleWatch(coin.id)}
                            className={cn(
                              "p-1 rounded-full shrink-0 transition-colors",
                              isWatched(coin.id) ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)] hover:text-[var(--brand-accent)]"
                            )}
                            aria-label={isWatched(coin.id) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className={cn("w-4 h-4", isWatched(coin.id) && "fill-current")} />
                          </motion.button>
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
                <div className="space-y-1.5">
                  {trendingData.coins.slice(0, 7).map((coin, i) => (
                    <button
                      key={coin.id}
                      onClick={() => router.push(`/crypto/market/${coin.id}`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--brand-surface-2)] transition-colors text-start group"
                    >
                      <span className="text-[10px] font-latin text-[var(--brand-muted)] w-4 text-center shrink-0">{fa(i + 1, lang)}</span>
                      {coin.thumb && <img src={coin.thumb} alt={coin.name} className="w-4 h-4 rounded-full shrink-0" loading="lazy" />}
                      <span className="text-xs font-bold text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors truncate flex-1">{coin.name}</span>
                      <span className="text-[10px] font-latin text-[var(--brand-muted)] shrink-0">{coin.symbol}</span>
                    </button>
                  ))}
                </div>
              </SidebarCard>
            )}

            {/* Altcoin Season Gauge */}
            {altcoinSeason && altcoinSeason.altcoinsCount > 0 && (
              <SidebarCard
                title={lang === "fa" ? "فصل آلت‌کوین‌ها" : "Altcoin Season"}
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                accent="#a78bfa"
              >
                <div className="flex items-center gap-3">
                  <AltcoinSeasonGauge index={altcoinSeason.index} lang={lang} />
                  <div className="flex-1 min-w-0 text-xs space-y-1">
                    <div className={cn("font-bold", altcoinSeason.index >= 75 ? "text-[var(--brand-accent)]" : altcoinSeason.index <= 25 ? "text-amber-400" : "text-[var(--brand-muted)]")}>
                      {altcoinSeason.season}
                    </div>
                    <div className="text-[10px] text-[var(--brand-muted)]">
                      {fa(altcoinSeason.outperformingCount, lang)} / {fa(altcoinSeason.altcoinsCount, lang)} {lang === "fa" ? "از BTC جلوتر" : "beating BTC"}
                    </div>
                    <div className="text-[10px] font-latin text-[var(--brand-muted)]">
                      BTC 24h: <span className={altcoinSeason.btcChange24h >= 0 ? "text-[var(--brand-accent)]" : "text-red-400"}>{altcoinSeason.btcChange24h >= 0 ? "+" : ""}{altcoinSeason.btcChange24h.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </SidebarCard>
            )}

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
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 overflow-hidden relative">
      <div className="absolute top-0 end-0 w-px h-full" style={{ background: `linear-gradient(to bottom, transparent, ${accent}, transparent)` }} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-latin font-semibold mb-3" style={{ color: accent }}>
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function AltcoinSeasonGauge({ index, lang }: { index: number; lang: "fa" | "en" }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const arc = (index / 100) * circumference;
  const color = index >= 75 ? "#22c55e" : index <= 25 ? "#f97316" : "#a78bfa";

  return (
    <div className="relative shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#1c2027" strokeWidth="8" />
        <circle cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${arc} ${circumference - arc}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold font-latin" style={{ color }}>{fa(index, lang)}</span>
      </div>
    </div>
  );
}

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
