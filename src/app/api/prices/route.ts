import { NextResponse } from "next/server";

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
let cached: { coins: unknown[]; fetchedAt: string } | null = null;

const TICKER_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP",
  "ADA", "DOGE", "AVAX", "TRX", "LINK",
];

async function fetchCMC(): Promise<{ coins: unknown[]; fetchedAt: string } | null> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    const url = "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=20&sortBy=market_cap&sortType=desc&convert=USD";

    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(id);

    if (!res.ok) return null;
    const data = await res.json();
    const allCoins = data?.data || [];

    // Filter to our ticker symbols and take top 10
    const tickerCoins = TICKER_SYMBOLS.map(sym =>
      allCoins.find((c: { symbol: string }) =>
        c.symbol?.toUpperCase() === sym
      )
    ).filter(Boolean).slice(0, 10);

    if (tickerCoins.length < 5) return null;

    const coins = tickerCoins.map((c: any) => ({
      id: c.slug || c.symbol?.toLowerCase() || "",
      symbol: c.symbol?.toUpperCase() || "",
      name: c.name || "",
      image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
      price: c.quote?.USD?.price || 0,
      change24h: c.quote?.USD?.percentChange24h || 0,
      marketCap: c.quote?.USD?.marketCap || 0,
      volume: c.quote?.USD?.volume24h || 0,
    }));

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

    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(id);

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
    cached = cmcResult;
    return NextResponse.json(
      cmcResult,
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // Try in-memory cache (5min TTL)
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json(
      { ...cached, cached: true },
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
    cached = geckoResult;
    return NextResponse.json(
      geckoResult,
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // Return stale cache if available
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true, stale: true },
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
