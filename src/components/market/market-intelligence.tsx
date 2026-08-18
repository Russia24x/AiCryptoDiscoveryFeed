"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

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
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
}

type SortField = "market_cap_rank" | "current_price" | "price_change_percentage_24h" | "total_volume" | "market_cap";
type SortDir = "asc" | "desc";

/**
 * Market Intelligence page — a complete crypto market portal.
 * Sortable table of top 100 coins. Click a row → /crypto/market/[coin].
 */
export function MarketIntelligence() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("market_cap_rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, error, refetch, isFetching } = useQuery<{ coins: Coin[] }>({
    queryKey: ["market", "coingecko-markets", "top100"],
    queryFn: async () => {
      const res = await fetch(
        "/api/market/coingecko-markets?per_page=100&sparkline=false",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.rateLimited) {
        throw new Error(lang === "fa" ? "درخواست‌های زیاد. یک دقیقه صبر کنید." : "Rate limited. Try in a minute.");
      }
      return json as { coins: Coin[] };
    },
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const coins = data?.coins || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return coins;
    const q = search.toLowerCase().trim();
    return coins.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [coins, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const onSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "market_cap_rank" ? "asc" : "desc");
    }
  };

  const onCoinClick = (coin: Coin) => {
    router.push(`/crypto/market/${coin.id}`);
  };

  const fa = (n: string | number) =>
    lang === "fa" ? String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : String(n);

  const fmtPrice = (p: number) => {
    if (p >= 1) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 0.01) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  };

  const fmtCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg)]">
      {/* Header bar */}
      <div className="sticky top-16 z-30 bg-[var(--brand-bg)]/95 backdrop-blur-xl border-b border-[var(--brand-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1 className="font-display text-lg md:text-xl font-bold text-[var(--brand-text)] truncate">
                {lang === "fa" ? "هوش بازار" : "Market Intelligence"}
              </h1>
              <span className="text-[10px] font-latin text-[var(--brand-muted)] bg-[var(--brand-surface-2)] px-2 py-0.5 rounded-full shrink-0">
                {lang === "fa" ? "۱۰۰ ارز برتر" : "Top 100"}
              </span>
            </div>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-[var(--brand-muted)] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی ارز..." : "Search coin..."}
                className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full pl-9 pr-3 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)] w-32 sm:w-48"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label={lang === "fa" ? "به‌روزرسانی" : "Refresh"}
              className="p-2 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-accent)]" />
            <span className="text-sm text-[var(--brand-muted)]">
              {lang === "fa" ? "در حال بارگذاری داده‌های بازار..." : "Loading market data..."}
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <p className="text-sm text-[var(--brand-text)]">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110"
            >
              {lang === "fa" ? "تلاش مجدد" : "Retry"}
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="w-8 h-8 text-[var(--brand-muted)] opacity-50" />
            <p className="text-sm text-[var(--brand-muted)]">
              {lang === "fa" ? "ارزی یافت نشد" : "No coins found"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--brand-border)] bg-[var(--brand-surface-2)]/50">
                    <SortHeader label="#" field="market_cap_rank" sortField={sortField} sortDir={sortDir} onSort={onSort} align="start" />
                    <th className="px-3 py-2 text-start font-bold text-[var(--brand-muted)] uppercase tracking-wider">
                      {lang === "fa" ? "نام" : "Name"}
                    </th>
                    <SortHeader label={lang === "fa" ? "قیمت" : "Price"} field="current_price" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                    <SortHeader label="24h %" field="price_change_percentage_24h" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                    <SortHeader label={lang === "fa" ? "حجم ۲۴س" : "24h Vol"} field="total_volume" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                    <SortHeader label={lang === "fa" ? "مارکت کپ" : "Market Cap"} field="market_cap" sortField={sortField} sortDir={sortDir} onSort={onSort} align="end" />
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((coin) => {
                    const change = coin.price_change_percentage_24h || 0;
                    const up = change >= 0;
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => onCoinClick(coin)}
                        className="border-b border-[var(--brand-border)]/50 hover:bg-[var(--brand-surface-2)]/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-3 py-2.5 text-start text-[var(--brand-muted)] font-latin">
                          {fa(coin.market_cap_rank || "-")}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {coin.image && (
                              <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full shrink-0" loading="lazy" />
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-[var(--brand-text)] group-hover:text-[var(--brand-accent)] transition-colors truncate">
                                {coin.name}
                              </div>
                              <div className="text-[10px] text-[var(--brand-muted)] font-latin uppercase">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-text)]">
                          {fa(fmtPrice(coin.current_price))}
                        </td>
                        <td className={cn("px-3 py-2.5 text-end font-latin tabular-nums font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
                          {up ? "+" : ""}{fa(change.toFixed(2))}%
                        </td>
                        <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-muted)]">
                          {fa(fmtCompact(coin.total_volume))}
                        </td>
                        <td className="px-3 py-2.5 text-end font-latin tabular-nums text-[var(--brand-muted)]">
                          {fa(fmtCompact(coin.market_cap))}
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          <ExternalLink className="w-3.5 h-3.5 text-[var(--brand-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden space-y-2">
              {sorted.map((coin) => {
                const change = coin.price_change_percentage_24h || 0;
                const up = change >= 0;
                return (
                  <button
                    key={coin.id}
                    onClick={() => onCoinClick(coin)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] hover:border-[var(--brand-accent)]/40 transition-colors text-start"
                  >
                    <span className="text-[10px] font-latin text-[var(--brand-muted)] w-5 text-center shrink-0">
                      {fa(coin.market_cap_rank || "-")}
                    </span>
                    {coin.image && (
                      <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shrink-0" loading="lazy" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[var(--brand-text)] truncate">{coin.name}</div>
                      <div className="text-[10px] text-[var(--brand-muted)] font-latin uppercase">{coin.symbol}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="font-latin tabular-nums text-sm font-bold text-[var(--brand-text)]">
                        {fa(fmtPrice(coin.current_price))}
                      </div>
                      <div className={cn("font-latin tabular-nums text-[10px] font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
                        {up ? "+" : ""}{fa(change.toFixed(2))}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============= Sort Header ============= */
function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  align,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  align: "start" | "end";
}) {
  const isActive = field === sortField;
  return (
    <th className={cn("px-3 py-2", align === "end" ? "text-end" : "text-start")}>
      <button
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 font-bold uppercase tracking-wider transition-colors",
          isActive ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
        )}
      >
        {label}
        {isActive ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
