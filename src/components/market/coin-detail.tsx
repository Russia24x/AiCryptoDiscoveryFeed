"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Globe,
  Twitter,
  Github,
  MessageCircle,
  Layers,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface CoinDetailProps {
  coinId: string; // CoinGecko coin ID (e.g., "bitcoin")
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
    price_change_24h: number;
    price_change_percentage_1h_in_currency: { usd: number };
    price_change_percentage_24h_in_currency: { usd: number };
    price_change_percentage_7d_in_currency: { usd: number };
    price_change_percentage_30d_in_currency: { usd: number };
    price_change_percentage_60d_in_currency: { usd: number };
    price_change_percentage_200d_in_currency: { usd: number };
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

interface DefiLlamaProtocol {
  found: boolean;
  name: string;
  symbol: string;
  category: string;
  chain: string;
  chains: string[];
  tvl: number;
  change_1h: number;
  change_1d: number;
  change_7d: number;
  description: string;
  url: string;
  parentProtocol: string | null;
  topChains: Array<{ chain: string; tvl: number }>;
}

interface DefiLlamaFees {
  found: boolean;
  name: string;
  category: string;
  protocolType: string;
  matchedVersions: number;
  fees24h: number;
  fees7d: number;
  fees30d: number;
  fees1y: number;
  feesAllTime: number;
  annualizedFees: number;
  monthlyAverageFees: number;
  change1d: number;
  change7d: number;
  change30d: number;
  change1m: number;
  logo: string;
  methodologyURL: string;
  // Rich data from /summary/fees/{slug}
  description?: string;
  methodology?: Record<string, string>;
  breakdownMethodology?: Record<string, Record<string, string>>;
  feesChart?: Array<{ timestamp: number; value: number }>;
}

/**
 * CoinDetail — full coin detail page combining data from:
 *   1. CoinGecko (primary: price, market cap, supply, ATH/ATL, description, links, sparkline)
 *   2. DefiLlama (secondary: TVL data if the coin is a DeFi protocol)
 *
 * Caching strategy (local-first, rate-limit aware):
 *   - CoinGecko coin detail: staleTime 2min, edge-cached 120s
 *   - DefiLlama protocol: staleTime 5min, edge-cached 300s
 *   - Both queries run in parallel (useQuery × 2)
 *   - If CoinGecko rate-limits (429), show error with retry
 *   - If DefiLlama has no data for this coin, silently skip (not all coins are DeFi)
 *   - TanStack Query caches both — navigating back to the same coin is instant
 */
export function CoinDetail({ coinId }: CoinDetailProps) {
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const Back = isRTL ? ArrowLeft : ArrowRight;

  // --- Primary: CoinGecko coin detail ---
  const { data: coin, isLoading, error } = useQuery<CoinGeckoCoin>({
    queryKey: ["market", "coingecko-coin", coinId],
    queryFn: async () => {
      const res = await fetch(`/api/market/coingecko-coin?id=${encodeURIComponent(coinId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      if (json?.rateLimited) {
        throw new Error(lang === "fa" ? "درخواست‌های زیاد. یک دقیقه صبر کنید." : "Rate limited. Try in a minute.");
      }
      return json as CoinGeckoCoin;
    },
    staleTime: 2 * 60_000,
    retry: 1,
  });

  // --- Secondary: DefiLlama protocol TVL ---
  const { data: defiProtocol } = useQuery<DefiLlamaProtocol | null>({
    queryKey: ["market", "defillama-protocol", coinId],
    queryFn: async () => {
      const res = await fetch(`/api/market/defillama-protocol?gecko_id=${encodeURIComponent(coinId)}`, { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.found && typeof json.tvl === "number" && json.tvl > 0) return json as DefiLlamaProtocol;
      return null;
    },
    staleTime: 5 * 60_000,
    retry: 0,
    enabled: !!coinId,
  });

  // --- Tertiary: DefiLlama fees/revenue summary ---
  const { data: defiFees } = useQuery<DefiLlamaFees | null>({
    queryKey: ["market", "defillama-summary", coinId],
    queryFn: async () => {
      const res = await fetch(`/api/market/defillama-summary?gecko_id=${encodeURIComponent(coinId)}`, { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.found && (json.fees24h > 0 || json.fees30d > 0)) return json as DefiLlamaFees;
      return null;
    },
    staleTime: 5 * 60_000,
    retry: 0,
    enabled: !!coinId,
  });

  // --- Quaternary: TVL history chart (only for DeFi protocols) ---
  // Fetches /v2/historicalChainTvl/{chain} for the protocol's primary chain.
  // Only runs if defiProtocol has a chain value. Edge-cached 5min.
  const defiChain = defiProtocol?.chain || defiProtocol?.chains?.[0];
  const { data: tvlHistory } = useQuery<Array<{ date: number; tvl: number }>>({
    queryKey: ["market", "defillama-tvl-history", defiChain],
    queryFn: async () => {
      if (!defiChain) return [];
      const res = await fetch(
        `/api/market/defillama?path=historicalChainTvl/${encodeURIComponent(defiChain)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return [];
      const json = await res.json();
      if (!Array.isArray(json)) return [];
      // Take last 90 days for a nice chart
      return json.slice(-90).map((entry: { date: number; tvl: number }) => ({
        date: entry.date * 1000,
        tvl: entry.tvl,
      }));
    },
    staleTime: 10 * 60_000,
    retry: 0,
    enabled: !!defiChain,
  });

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

  if (isLoading) {
    return <CoinDetailSkeleton lang={lang} />;
  }

  if (error || !coin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <p className="text-sm text-[var(--brand-text)]">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button onClick={() => router.push("/crypto/market")} className="px-4 py-2 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110">
          {lang === "fa" ? "بازگشت به بازار" : "Back to market"}
        </button>
      </div>
    );
  }

  const md = coin.market_data;
  const change24h = md.price_change_percentage_24h_in_currency?.usd || 0;
  const up = change24h >= 0;
  const description = lang === "fa" ? (coin.description.fa || coin.description.en) : coin.description.en;
  const hasDefi = !!defiProtocol && defiProtocol.tvl > 0;
  const hasFees = !!defiFees && defiFees.fees24h > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
      {/* Back button */}
      <button onClick={() => router.push("/crypto/market")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface)] transition-colors mb-4">
        <Back className="w-3.5 h-3.5" />
        {lang === "fa" ? "بازگشت به بازار" : "Back to market"}
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {coin.image?.large && <img src={coin.image.large} alt={coin.name} className="w-12 h-12 rounded-full" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--brand-text)]">{coin.name}</h1>
            <span className="text-sm font-latin text-[var(--brand-muted)] uppercase">{coin.symbol}</span>
            {coin.market_cap_rank && (
              <span className="text-[10px] font-latin text-[var(--brand-muted)] bg-[var(--brand-surface-2)] px-2 py-0.5 rounded-full">#{fa(coin.market_cap_rank)}</span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-latin tabular-nums text-2xl font-bold text-[var(--brand-text)]">{fa(fmtPrice(md.current_price.usd))}</span>
            <span className={cn("font-latin tabular-nums text-sm font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>
              {up ? "+" : ""}{fa(change24h.toFixed(2))}%
            </span>
            <span className="text-[10px] text-[var(--brand-muted)]">24h</span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {md.sparkline_7d?.price && md.sparkline_7d.price.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">{lang === "fa" ? "نمودار ۷ روزه" : "7-day chart"}</div>
            <div className="flex items-center gap-2 text-[10px] font-latin text-[var(--brand-muted)]">
              <span>H: {fa(fmtPrice(Math.max(...md.sparkline_7d.price)))}</span>
              <span>L: {fa(fmtPrice(Math.min(...md.sparkline_7d.price)))}</span>
            </div>
          </div>
          <Sparkline prices={md.sparkline_7d.price} accent={up ? "#2dd4bf" : "#f87171"} />
        </div>
      )}

      {/* DeFi TVL Section (only if DefiLlama has data) */}
      {hasDefi && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent-soft)]">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-[var(--brand-accent)]" />
            <span className="text-xs font-bold text-[var(--brand-accent)] uppercase tracking-wider font-latin">{lang === "fa" ? "داده‌های دیفای" : "DeFi Data"}</span>
            <span className="text-[10px] text-[var(--brand-muted)]">via DefiLlama</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DefiStat label={lang === "fa" ? "TVL" : "TVL"} value={fa(fmtCompact(defiProtocol!.tvl))} />
            <DefiStat label={lang === "fa" ? "تغییر ۲۴س" : "24h Change"} value={`${fa(defiProtocol!.change_1d.toFixed(2))}%`} change={defiProtocol!.change_1d} />
            <DefiStat label={lang === "fa" ? "تغییر ۷ روز" : "7d Change"} value={`${fa(defiProtocol!.change_7d.toFixed(2))}%`} change={defiProtocol!.change_7d} />
            <DefiStat label={lang === "fa" ? "زنجیره" : "Chain"} value={defiProtocol!.chain || defiProtocol!.chains?.[0] || "—"} />
          </div>
          {defiProtocol!.category && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-[var(--brand-muted)]">{lang === "fa" ? "دسته:" : "Category:"}</span>
              <span className="font-bold text-[var(--brand-text)]">{defiProtocol!.category}</span>
            </div>
          )}
          <a href={`https://defillama.com/protocol/${coinId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs text-[var(--brand-accent)] hover:underline">
            <ExternalLink className="w-3 h-3" />
            {lang === "fa" ? "مشاهده در DefiLlama" : "View on DefiLlama"}
          </a>

          {/* TVL History Chart (90 days) */}
          {tvlHistory && tvlHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--brand-accent)]/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
                  {lang === "fa" ? "نمودار TVL (۹۰ روز)" : "TVL Chart (90d)"}
                </div>
                <div className="text-[10px] font-latin text-[var(--brand-muted)]">
                  {defiChain && <span>{defiChain}</span>}
                </div>
              </div>
              <TvlChart data={tvlHistory} lang={lang} />
            </div>
          )}
        </div>
      )}

      {/* Fees & Revenue Section (only if DefiLlama has fees data) */}
      {hasFees && (
        <div className="mb-6 p-4 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-latin">{lang === "fa" ? "درآمد و کارمزد" : "Fees & Revenue"}</span>
            <span className="text-[10px] text-[var(--brand-muted)]">via DefiLlama</span>
            {defiFees!.matchedVersions > 1 && (
              <span className="text-[10px] text-[var(--brand-muted)] bg-[var(--brand-surface-2)] px-1.5 py-0.5 rounded-full">
                {fa(defiFees!.matchedVersions)} {lang === "fa" ? "نسخه" : "versions"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DefiStat label={lang === "fa" ? "کارمزد ۲۴س" : "Fees 24h"} value={fa(fmtCompact(defiFees!.fees24h))} change={defiFees!.change1d} />
            <DefiStat label={lang === "fa" ? "کارمزد ۷ روز" : "Fees 7d"} value={fa(fmtCompact(defiFees!.fees7d))} />
            <DefiStat label={lang === "fa" ? "کارمزد ۳۰ روز" : "Fees 30d"} value={fa(fmtCompact(defiFees!.fees30d))} />
            <DefiStat label={lang === "fa" ? "کارمزد ۱ سال" : "Fees 1y"} value={fa(fmtCompact(defiFees!.fees1y))} />
            <DefiStat label={lang === "fa" ? "سالانه" : "Annualized"} value={fa(fmtCompact(defiFees!.annualizedFees))} />
            <DefiStat label={lang === "fa" ? "میانگین ماهانه" : "Monthly Avg"} value={fa(fmtCompact(defiFees!.monthlyAverageFees))} />
            <DefiStat label={lang === "fa" ? "کل تاریخچه" : "All Time"} value={fa(fmtCompact(defiFees!.feesAllTime))} />
            <DefiStat label={lang === "fa" ? "تغییر ۳۰ روز" : "30d Change"} value={`${fa(defiFees!.change30d.toFixed(2))}%`} change={defiFees!.change30d} />
          </div>

          {/* Fees history chart (30 days) */}
          {defiFees!.feesChart && defiFees!.feesChart.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1">
                {lang === "fa" ? "نمودار کارمزد ۳۰ روز" : "30-day fees chart"}
              </div>
              <Sparkline
                prices={defiFees!.feesChart.map((d) => d.value)}
                accent="#f59e0b"
              />
            </div>
          )}

          {/* Methodology (Revenue, HoldersRevenue, SupplySideRevenue descriptions) */}
          {defiFees!.methodology && Object.keys(defiFees!.methodology).length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#f59e0b]/20">
              <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-2">
                {lang === "fa" ? "متدولوژی درآمد" : "Revenue Methodology"}
              </div>
              <div className="space-y-1.5">
                {Object.entries(defiFees!.methodology).map(([key, value]) => (
                  <div key={key} className="text-[10px] leading-relaxed">
                    <span className="font-bold text-amber-400">{key}: </span>
                    <span className="text-[var(--brand-muted)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* External links */}
      <div className="flex flex-wrap gap-2 mb-6">
        {coin.links?.homepage?.[0] && <ExtLink href={coin.links.homepage[0]} icon={<Globe className="w-3.5 h-3.5" />} label={lang === "fa" ? "وب‌سایت" : "Website"} />}
        {coin.links?.twitter_screen_name && <ExtLink href={`https://twitter.com/${coin.links.twitter_screen_name}`} icon={<Twitter className="w-3.5 h-3.5" />} label="Twitter" />}
        {coin.links?.subreddit_url && <ExtLink href={coin.links.subreddit_url} icon={<MessageCircle className="w-3.5 h-3.5" />} label="Reddit" />}
        {coin.links?.repos_url?.github?.[0] && <ExtLink href={coin.links.repos_url.github[0]} icon={<Github className="w-3.5 h-3.5" />} label="GitHub" />}
        <ExtLink href={`https://www.coingecko.com/en/coins/${coin.id}`} icon={<ExternalLink className="w-3.5 h-3.5" />} label="CoinGecko" />
        <ExtLink href={`https://coinmarketcap.com/currencies/${coin.id}/`} icon={<ExternalLink className="w-3.5 h-3.5" />} label="CMC" />
        {hasDefi && <ExtLink href={`https://defillama.com/protocol/${coinId}`} icon={<ExternalLink className="w-3.5 h-3.5" />} label="DefiLlama" />}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label={lang === "fa" ? "مارکت کپ" : "Market Cap"} value={fa(fmtCompact(md.market_cap?.usd || 0))} />
        <StatCard label={lang === "fa" ? "حجم ۲۴س" : "24h Volume"} value={fa(fmtCompact(md.total_volume?.usd || 0))} />
        <StatCard label={lang === "fa" ? "بالاترین ۲۴س" : "24h High"} value={fa(fmtPrice(md.high_24h?.usd || 0))} accent="#2dd4bf" />
        <StatCard label={lang === "fa" ? "پایین‌ترین ۲۴س" : "24h Low"} value={fa(fmtPrice(md.low_24h?.usd || 0))} accent="#f87171" />
        {md.fully_diluted_valuation?.usd && (
          <StatCard label={lang === "fa" ? "ارزش کامل" : "FDV"} value={fa(fmtCompact(md.fully_diluted_valuation.usd))} />
        )}
      </div>

      {/* Price changes */}
      <div className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
        <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">{lang === "fa" ? "تغییرات قیمت" : "Price Changes"}</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <PriceChange label="1h" value={md.price_change_percentage_1h_in_currency?.usd} fa={fa} />
          <PriceChange label="24h" value={md.price_change_percentage_24h_in_currency?.usd} fa={fa} />
          <PriceChange label="7d" value={md.price_change_percentage_7d_in_currency?.usd} fa={fa} />
          <PriceChange label="30d" value={md.price_change_percentage_30d_in_currency?.usd} fa={fa} />
          <PriceChange label="60d" value={md.price_change_percentage_60d_in_currency?.usd} fa={fa} />
          <PriceChange label="1y" value={md.price_change_percentage_1y_in_currency?.usd} fa={fa} />
        </div>
      </div>

      {/* ATH / ATL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1">{lang === "fa" ? "بالاترین تاریخی (ATH)" : "All-Time High (ATH)"}</div>
          <div className="font-latin tabular-nums text-lg font-bold text-[var(--brand-text)]">{fa(fmtPrice(md.ath?.usd || 0))}</div>
          <div className="text-[10px] text-[var(--brand-muted)] mt-1">
            {md.ath_date?.usd ? fa(fmtDate(md.ath_date.usd)) : ""} · <span className="text-red-400">{fa((md.ath_change_percentage?.usd || 0).toFixed(2))}%</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1">{lang === "fa" ? "پایین‌ترین تاریخی (ATL)" : "All-Time Low (ATL)"}</div>
          <div className="font-latin tabular-nums text-lg font-bold text-[var(--brand-text)]">{fa(fmtPrice(md.atl?.usd || 0))}</div>
          <div className="text-[10px] text-[var(--brand-muted)] mt-1">
            {md.atl_date?.usd ? fa(fmtDate(md.atl_date.usd)) : ""} · <span className="text-[var(--brand-accent)]">{fa((md.atl_change_percentage?.usd || 0).toFixed(2))}%</span>
          </div>
        </div>
      </div>

      {/* Supply */}
      <div className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
        <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">{lang === "fa" ? "عرضه" : "Supply"}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div><span className="text-[var(--brand-muted)]">{lang === "fa" ? "در گردش: " : "Circulating: "}</span><span className="font-latin tabular-nums text-[var(--brand-text)]">{fa(fmtCompact(md.circulating_supply || 0))} {coin.symbol.toUpperCase()}</span></div>
          <div><span className="text-[var(--brand-muted)]">{lang === "fa" ? "کل: " : "Total: "}</span><span className="font-latin tabular-nums text-[var(--brand-text)]">{md.total_supply ? `${fa(fmtCompact(md.total_supply))} ${coin.symbol.toUpperCase()}` : "—"}</span></div>
          <div><span className="text-[var(--brand-muted)]">{lang === "fa" ? "حداکثر: " : "Max: "}</span><span className="font-latin tabular-nums text-[var(--brand-text)]">{md.max_supply ? `${fa(fmtCompact(md.max_supply))} ${coin.symbol.toUpperCase()}` : "∞"}</span></div>
        </div>
        {/* Supply progress bar (circulating / max) */}
        {md.max_supply && md.circulating_supply && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-[var(--brand-surface-2)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${Math.min(100, (md.circulating_supply / md.max_supply) * 100)}%` }} />
            </div>
            <div className="text-[10px] text-[var(--brand-muted)] mt-1 font-latin">
              {fa(((md.circulating_supply / md.max_supply) * 100).toFixed(1))}% {lang === "fa" ? "ماین شده" : "mined"}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      {coin.categories && coin.categories.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-2">{lang === "fa" ? "دسته‌ها" : "Categories"}</div>
          <div className="flex flex-wrap gap-1.5">
            {coin.categories.filter(c => c && c.length > 0).slice(0, 10).map((cat) => (
              <span key={cat} className="text-[10px] px-2 py-1 rounded-full bg-[var(--brand-surface-2)] text-[var(--brand-muted)] border border-[var(--brand-border)]">{cat}</span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-2">{lang === "fa" ? "درباره" : "About"}</div>
          <div className="text-xs text-[var(--brand-text)] leading-relaxed prose-sm max-w-none" dir="auto" dangerouslySetInnerHTML={{ __html: description.split("\n").slice(0, 5).join("\n") }} />
        </div>
      )}
    </div>
  );
}

/* ============= TVL Chart (area chart with gradient) ============= */
function TvlChart({ data, lang }: { data: Array<{ date: number; tvl: number }>; lang: "fa" | "en" }) {
  if (!data || data.length === 0) return null;
  const width = 600;
  const height = 100;
  const min = Math.min(...data.map((d) => d.tvl));
  const max = Math.max(...data.map((d) => d.tvl));
  const range = max - min || 1;
  const fa = (n: string | number) =>
    lang === "fa" ? String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : String(n);
  const fmtCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${(n / 1e3).toFixed(0)}K`;
  };

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.tvl - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      {/* Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tvl-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#tvl-grad)" stroke="none" />
        <polyline points={points} fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
      </svg>
      {/* Min/Max labels */}
      <div className="flex items-center justify-between text-[10px] font-latin text-[var(--brand-muted)] mt-1">
        <span>90d low: {fa(fmtCompact(min))}</span>
        <span>90d high: {fa(fmtCompact(max))}</span>
      </div>
    </div>
  );
}

/* ============= Sparkline ============= */
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
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#spark-grad)" stroke="none" />
      <polyline points={points} fill="none" stroke={accent} strokeWidth="1.5" />
    </svg>
  );
}

/* ============= Stat Card ============= */
function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)]">
      <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1">{label}</div>
      <div className="font-latin tabular-nums text-sm font-bold" style={{ color: accent || "var(--brand-text)" }}>{value}</div>
    </div>
  );
}

/* ============= DeFi Stat ============= */
function DefiStat({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--brand-surface)]/50 border border-[var(--brand-accent)]/20">
      <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-1">{label}</div>
      <div className={cn("font-latin tabular-nums text-sm font-bold", change !== undefined ? (change >= 0 ? "text-[var(--brand-accent)]" : "text-red-400") : "text-[var(--brand-text)]")}>{value}</div>
    </div>
  );
}

/* ============= Price Change ============= */
function PriceChange({ label, value, fa }: { label: string; value?: number; fa: (n: string | number) => string }) {
  if (value === undefined || value === null) {
    return <div className="text-center"><div className="text-[10px] text-[var(--brand-muted)] mb-1">{label}</div><div className="font-latin tabular-nums text-sm text-[var(--brand-muted)]">—</div></div>;
  }
  const up = value >= 0;
  return (
    <div className="text-center">
      <div className="text-[10px] text-[var(--brand-muted)] mb-1">{label}</div>
      <div className={cn("font-latin tabular-nums text-sm font-bold", up ? "text-[var(--brand-accent)]" : "text-red-400")}>{up ? "+" : ""}{fa(value.toFixed(2))}%</div>
    </div>
  );
}

/* ============= External Link ============= */
function ExtLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors">
      {icon}<span>{label}</span>
    </a>
  );
}

/* ============= Loading Skeleton ============= */
function CoinDetailSkeleton({ lang }: { lang: "fa" | "en" }) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-40 shimmer rounded" />
          <div className="h-4 w-24 shimmer rounded" />
        </div>
      </div>
      <div className="mb-6 h-24 shimmer rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 shimmer rounded-lg" />)}
      </div>
      <div className="mb-6 h-32 shimmer rounded-xl" />
      <div className="text-sm text-[var(--brand-muted)] text-center py-8">
        {lang === "fa" ? "در حال بارگذاری جزئیات ارز..." : "Loading coin details..."}
      </div>
    </div>
  );
}
