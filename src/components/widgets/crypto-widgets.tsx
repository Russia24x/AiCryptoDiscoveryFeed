"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import {
  WidgetCard,
  SkeletonRow,
  FallbackMsg,
  formatUsd,
  formatFa,
  numFontClass,
  changeColor,
} from "@/components/widgets/widget-primitives";
import { cn } from "@/lib/utils";

/**
 * Crypto category-specific widgets — shown on /crypto page.
 *
 * Architecture (local-first):
 *   - ETH/SOL price widget fetches from /api/market/binance-ticker (already
 *     edge-cached 10s on the server, then TanStack Query caches 5s on
 *     the client). No extra upstream calls.
 *   - Top Gainers widget fetches from /api/market/top-gainers which is
 *     edge-cached 60s. Single call shared across all users.
 *   - Market Dominance widget fetches from /api/market/cmc-global which
 *     is edge-cached 60s.
 *
 * Total upstream API calls per page view (after cache hit):
 *   - 0 (all served from edge cache)
 *
 * Total upstream API calls per page view (cache miss):
 *   - 1 to Binance (for binance-ticker, shared with hero BTC widget)
 *   - 1 to CMC (for top-gainers, 60s cache)
 *   - 1 to CMC (for cmc-global, 60s cache)
 *   = 3 calls, all cached at the edge for subsequent users.
 */

/* ============= ETH widget ============= */
interface CoinTicker {
  symbol: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
}

function EthWidget() {
  const { lang } = useLanguage();
  const { data, isLoading } = useQuery<CoinTicker>({
    queryKey: ["market", "binance-ticker", "ETH"],
    queryFn: async () => {
      const res = await fetch("/api/market/binance-ticker", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const coin = json?.coins?.find((c: { symbol: string }) => c.symbol === "ETH");
      if (!coin || typeof coin.price !== "number") {
        throw new Error("ETH not found in ticker response");
      }
      return coin as CoinTicker;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const up = (data?.change24h ?? 0) >= 0;

  return (
    <WidgetCard
      title="Ethereum"
      icon={<span className="text-[10px] font-bold font-latin">Ξ</span>}
      accent="#627eea"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data ? (
        <>
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
            ${formatUsd(data.price, lang)}
          </div>
          <div className={cn("flex items-center gap-1 text-[11px] font-semibold mt-1", numFontClass(lang))}
               style={{ color: changeColor(data.change24h) }}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatFa(Math.abs(data.change24h).toFixed(2), lang)}% <span className="opacity-60">24h</span>
          </div>
          {data.high24h !== undefined && data.low24h !== undefined && (
            <div className={cn("flex items-center justify-between text-[9px] text-[var(--brand-muted)]/80 mt-1.5 pt-1.5 border-t border-[var(--brand-border)]/50", numFontClass(lang))}>
              <span>H: <span className="text-[var(--brand-accent)]/80">${formatUsd(data.high24h, lang)}</span></span>
              <span>L: <span className="text-red-400/80">${formatUsd(data.low24h, lang)}</span></span>
            </div>
          )}
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= SOL widget ============= */
function SolWidget() {
  const { lang } = useLanguage();
  const { data, isLoading } = useQuery<CoinTicker>({
    queryKey: ["market", "binance-ticker", "SOL"],
    queryFn: async () => {
      const res = await fetch("/api/market/binance-ticker", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const coin = json?.coins?.find((c: { symbol: string }) => c.symbol === "SOL");
      if (!coin || typeof coin.price !== "number") {
        throw new Error("SOL not found in ticker response");
      }
      return coin as CoinTicker;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const up = (data?.change24h ?? 0) >= 0;

  return (
    <WidgetCard
      title="Solana"
      icon={<span className="text-[10px] font-bold font-latin">◎</span>}
      accent="#9945ff"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data ? (
        <>
          <div className={cn("text-2xl md:text-3xl font-extrabold tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
            ${formatUsd(data.price, lang)}
          </div>
          <div className={cn("flex items-center gap-1 text-[11px] font-semibold mt-1", numFontClass(lang))}
               style={{ color: changeColor(data.change24h) }}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatFa(Math.abs(data.change24h).toFixed(2), lang)}% <span className="opacity-60">24h</span>
          </div>
          {data.high24h !== undefined && data.low24h !== undefined && (
            <div className={cn("flex items-center justify-between text-[9px] text-[var(--brand-muted)]/80 mt-1.5 pt-1.5 border-t border-[var(--brand-border)]/50", numFontClass(lang))}>
              <span>H: <span className="text-[var(--brand-accent)]/80">${formatUsd(data.high24h, lang)}</span></span>
              <span>L: <span className="text-red-400/80">${formatUsd(data.low24h, lang)}</span></span>
            </div>
          )}
        </>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Top Gainers widget ============= */
interface CoinListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmcRank: number;
  price: number;
  volume24h: number;
  marketCap: number;
  percentChange24h: number;
  percentChange7d: number;
}

function TopGainersWidget() {
  const { lang } = useLanguage();
  const { data, isLoading } = useQuery<{ coins: CoinListing[] }>({
    queryKey: ["market", "top-gainers"],
    queryFn: async () => {
      const res = await fetch("/api/market/top-gainers?limit=5", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { coins: CoinListing[] };
    },
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  return (
    <WidgetCard
      title={lang === "fa" ? "بزرگترین صعودها" : "Top Gainers"}
      icon={<TrendingUp className="w-3.5 h-3.5" />}
      accent="#22c55e"
    >
      {isLoading ? (
        <div className="space-y-2 py-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 shimmer rounded" />
          ))}
        </div>
      ) : data?.coins?.length ? (
        <div className="space-y-1.5">
          {data.coins.slice(0, 5).map((coin, i) => (
            <div key={coin.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-latin text-[var(--brand-muted)] w-4 text-start">
                  {(i + 1).toString().replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])}
                </span>
                <span className="font-bold text-[var(--brand-text)] truncate">{coin.symbol}</span>
                <span className="text-[10px] text-[var(--brand-muted)] truncate hidden sm:inline">
                  {coin.name}
                </span>
              </div>
              <div className={cn("flex items-center gap-1 shrink-0", numFontClass(lang))}>
                <span className="text-[var(--brand-muted)] tabular-nums">
                  ${formatUsd(coin.price, lang)}
                </span>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: changeColor(coin.percentChange24h) }}
                >
                  +{formatFa(coin.percentChange24h.toFixed(1), lang)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Market Dominance widget (mini chart) ============= */
interface GlobalMetrics {
  btcDominance: number;
  ethDominance: number;
  totalMarketCap: number;
  totalVolume24h: number;
  activeCryptoCurrencies: number;
}

function DominanceWidget() {
  const { lang } = useLanguage();
  const { data, isLoading } = useQuery<GlobalMetrics>({
    queryKey: ["market", "cmc-global"],
    queryFn: async () => {
      const res = await fetch("/api/market/cmc-global", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as GlobalMetrics;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  const btcDom = data?.btcDominance ?? 0;
  const ethDom = data?.ethDominance ?? 0;
  const otherDom = Math.max(0, 100 - btcDom - ethDom);

  // Donut chart SVG: 3 segments (BTC orange, ETH blue, others grey)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const btcArc = (btcDom / 100) * circumference;
  const ethArc = (ethDom / 100) * circumference;
  const otherArc = (otherDom / 100) * circumference;

  return (
    <WidgetCard
      title={lang === "fa" ? "تسلط بازار" : "Market Dominance"}
      icon={<span className="text-[10px] font-bold font-latin">%</span>}
      accent="#f7931a"
    >
      {isLoading ? (
        <SkeletonRow />
      ) : data ? (
        <div className="flex items-center gap-3">
          {/* Donut chart */}
          <div className="relative shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke="#1c2027"
                strokeWidth="8"
              />
              {/* BTC segment */}
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke="#f7931a"
                strokeWidth="8"
                strokeDasharray={`${btcArc} ${circumference - btcArc}`}
                strokeDashoffset="0"
              />
              {/* ETH segment */}
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke="#627eea"
                strokeWidth="8"
                strokeDasharray={`${ethArc} ${circumference - ethArc}`}
                strokeDashoffset={-btcArc}
              />
              {/* Others segment */}
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke="#8b94a3"
                strokeWidth="8"
                strokeDasharray={`${otherArc} ${circumference - otherArc}`}
                strokeDashoffset={-(btcArc + ethArc)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-[10px] font-bold font-latin", numFontClass(lang))}>
                {formatFa(btcDom.toFixed(0), lang)}%
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f7931a]" />
                <span className="font-bold">BTC</span>
              </span>
              <span className={cn("font-latin tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
                {formatFa(btcDom.toFixed(2), lang)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#627eea]" />
                <span className="font-bold">ETH</span>
              </span>
              <span className={cn("font-latin tabular-nums text-[var(--brand-text)]", numFontClass(lang))}>
                {formatFa(ethDom.toFixed(2), lang)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8b94a3]" />
                <span className="font-bold">{lang === "fa" ? "سایر" : "Others"}</span>
              </span>
              <span className={cn("font-latin tabular-nums text-[var(--brand-muted)]", numFontClass(lang))}>
                {formatFa(otherDom.toFixed(2), lang)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <FallbackMsg />
      )}
    </WidgetCard>
  );
}

/* ============= Crypto Widgets Grid — exported for category-page.tsx ============= */
export function CryptoWidgets() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <EthWidget />
      <SolWidget />
      <TopGainersWidget />
      <DominanceWidget />
    </div>
  );
}
