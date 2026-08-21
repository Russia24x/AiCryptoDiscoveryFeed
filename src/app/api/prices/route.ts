import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createFallbackCache } from "@/lib/fallback-cache";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/prices
 *
 * Returns a 10-coin price ticker for the top bar.
 *
 * Strategy (Phase 27):
 *  - PRIMARY: Use CMC keyless API (same as /api/market/cmc-listings)
 *  - FALLBACK: In-memory cache (5min TTL)
 *  - LAST RESORT: CoinGecko (rate-limited)
 *
 * This route NO LONGER calls CoinGecko directly for every request.
 * Instead, it calls CMC (no rate-limit) and only falls back to CoinGecko
 * if CMC is unavailable.
 *
 * Caching: edge-cached 60s, in-memory cache 5min.
 */

const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache
const cache = createFallbackCache<{ coins: unknown[]; fetchedAt: string }>();

const TICKER_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP",
  "ADA", "DOGE", "AVAX", "TRX", "LINK",
];

async function fetchCMC(): Promise<{ coins: unknown[]; fetchedAt: string } | null> {
  try {
    // Use EXACT same URL + headers as /api/market/cmc-listings (proven to work)
    const url = "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=20&sortBy=market_cap&sortType=desc";

    const res = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
      },
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    if (!res.ok) return null;
    const data = await res.json();

    // CMC keyless API returns data in: data.cryptoCurrencyList
    const rawList = data?.data?.cryptoCurrencyList;
    if (!Array.isArray(rawList)) return null;

    // Filter to our ticker symbols and take top 10
    const tickerCoins = TICKER_SYMBOLS.map(sym =>
      rawList.find((c: { symbol: string }) =>
        c.symbol?.toUpperCase() === sym
      )
    ).filter(Boolean).slice(0, 10);

    if (tickerCoins.length < 5) return null;

    // Parse using same logic as cmc-listings route
    const coins = tickerCoins.map((c: any) => {
      const quote = c?.quotes?.[0] || {};
      return {
        id: c.slug || c.symbol?.toLowerCase() || "",
        symbol: c.symbol?.toUpperCase() || "",
        name: c.name || "",
        image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
        price: Number(quote.price) || 0,
        change24h: Number(quote.percentChange24h) || 0,
        marketCap: Number(quote.marketCap) || 0,
        volume: Number(quote.volume24h) || 0,
      };
    });

    return { coins, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

async function fetchCoinGecko(): Promise<{ coins: unknown[]; fetchedAt: string } | null> {
  try {
    const COIN_IDS = [
      "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
      "cardano", "dogecoin", "avalanche-2", "tron", "chainlink",
    ];
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(
      ","
    )}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;

    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    if (!res.ok) return null;
    const data: Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      total_volume: number;
    }> = await res.json();

    const coins = data.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      change24h: c.price_change_percentage_24h || 0,
      marketCap: c.market_cap,
      volume: c.total_volume,
    }));

    return { coins, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function GET() {
  // Try CMC first (no rate-limit)
  const cmcResult = await fetchCMC();
  if (cmcResult) {
    cache.set(cmcResult);
    return NextResponse.json(
      cmcResult,
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // Try in-memory cache (5min TTL for proactive refresh)
  const cachedEntry = cache.get();
  if (cachedEntry && Date.now() - new Date(cachedEntry.data.fetchedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json(
      { ...cachedEntry.data, cached: true },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // Last resort: CoinGecko (rate-limited)
  const geckoResult = await fetchCoinGecko();
  if (geckoResult) {
    cache.set(geckoResult);
    return NextResponse.json(
      geckoResult,
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // Return stale cache if available (indefinitely — see cache policy)
  const fallback = cache.get();
  if (fallback) {
    return NextResponse.json(
      { ...fallback.data, cached: true, stale: true },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // No data available
  return NextResponse.json(
    {
      error: "Failed to fetch prices from all sources",
      coins: [],
    },
    { status: 200 }
  );
}
