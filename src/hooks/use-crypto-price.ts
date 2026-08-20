"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * useCryptoPrice — unified crypto price hook with multi-source fallback.
 *
 * Fallback chain (NO new API calls — all from shared TanStack Query cache):
 *   1. /api/market/binance-ticker (real-time, Binance → Coinbase → CoinGecko)
 *   2. /api/prices (CMC, 10-coin ticker, edge-cached 60s)
 *   3. /api/market/cmc-listings (CMC, 100-coin, edge-cached 60s)
 *
 * How it works:
 *   - Tries binance-ticker first (fastest, real-time)
 *   - If that fails or doesn't have the symbol, falls back to /api/prices
 *   - If /api/prices doesn't have it either, falls back to cmc-listings
 *   - All three share TanStack Query cache with other components
 *   - Zero additional API calls if data is already cached
 *
 * Symbols supported: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, TRX, LINK
 */

export interface CryptoPrice {
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  source: string;
}

// Map our display symbols to CMC slugs for fallback
const SYMBOL_TO_SLUG: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  TRX: "tron",
  LINK: "chainlink",
};

export function useCryptoPrice(symbol: string) {
  // Source 1: binance-ticker (shared with hero widgets)
  // staleTime 30s, refetchInterval 60s — was 10s/15s which was way too
  // aggressive (4 calls/min per widget, ×4 widgets = 16 calls/min just for
  // hero widgets). Now 1 call/min, refreshed on window focus too.
  // For users who need real-time prices, the ticker bar (which uses its
  // own setInterval) already updates every 15s and shares the same
  // /api/market/binance-ticker endpoint — so the actual visible price
  // in the ticker is still real-time.
  const tickerQuery = useQuery<{ coins: Array<{ symbol: string; price: number; change24h: number; high24h?: number; low24h?: number }> }>({
    queryKey: ["market", "binance-ticker"],
    queryFn: async () => {
      const res = await fetch("/api/market/binance-ticker", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { coins: any[] };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Source 2: /api/prices (CMC, shared with ticker bar)
  // staleTime 2min, refetchInterval 2min — was 60s/60s.
  // /api/prices is CMC-sourced (no CoinGecko rate-limit risk), but
  // reducing the call frequency saves Cloudflare Worker invocations.
  const pricesQuery = useQuery<{ coins: Array<{ symbol: string; price: number; change24h: number }> }>({
    queryKey: ["prices"],
    queryFn: async () => {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { coins: any[] };
    },
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
  });

  // Source 3: cmc-listings (shared with market table)
  // No refetchInterval — relies on refetchOnWindowFocus only.
  // This is the fallback; if the user keeps the tab open for 30min
  // without switching, the data stays stale (which is fine — they
  // can hit the Refresh button on the market page).
  const cmcQuery = useQuery<{ coins: Array<{ symbol: string; price: number; percentChange24h: number }> }>({
    queryKey: ["market", "cmc-listings", "top100"],
    queryFn: async () => {
      const res = await fetch("/api/market/cmc-listings?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { coins: any[] };
    },
    staleTime: 5 * 60_000,
  });

  const upperSymbol = symbol.toUpperCase();

  // Try source 1: binance-ticker
  const tickerCoin = tickerQuery.data?.coins?.find(
    (c: any) => c.symbol === upperSymbol
  );
  if (tickerCoin && typeof tickerCoin.price === "number" && tickerCoin.price > 0) {
    return {
      data: {
        price: tickerCoin.price,
        change24h: tickerCoin.change24h || 0,
        high24h: tickerCoin.high24h,
        low24h: tickerCoin.low24h,
        source: "binance",
      } as CryptoPrice,
      isLoading: tickerQuery.isLoading,
      isFetching: tickerQuery.isFetching,
    };
  }

  // Try source 2: /api/prices (CMC)
  const priceCoin = pricesQuery.data?.coins?.find(
    (c: any) => c.symbol === upperSymbol
  );
  if (priceCoin && typeof priceCoin.price === "number" && priceCoin.price > 0) {
    return {
      data: {
        price: priceCoin.price,
        change24h: priceCoin.change24h || 0,
        source: "cmc",
      } as CryptoPrice,
      isLoading: pricesQuery.isLoading && !tickerQuery.isLoading,
      isFetching: pricesQuery.isFetching,
    };
  }

  // Try source 3: cmc-listings (CMC, different format)
  const slug = SYMBOL_TO_SLUG[upperSymbol];
  if (slug && cmcQuery.data?.coins) {
    const cmcCoin = cmcQuery.data.coins.find(
      (c: any) => c.slug === slug || c.symbol?.toUpperCase() === upperSymbol
    );
    if (cmcCoin && typeof cmcCoin.price === "number" && cmcCoin.price > 0) {
      return {
        data: {
          price: cmcCoin.price,
          change24h: cmcCoin.percentChange24h || 0,
          source: "cmc",
        } as CryptoPrice,
        isLoading: cmcQuery.isLoading && !tickerQuery.isLoading && !pricesQuery.isLoading,
        isFetching: cmcQuery.isFetching,
      };
    }
  }

  // All sources failed or still loading
  return {
    data: null,
    isLoading: tickerQuery.isLoading && pricesQuery.isLoading && cmcQuery.isLoading,
    isFetching: tickerQuery.isFetching || pricesQuery.isFetching || cmcQuery.isFetching,
  };
}
