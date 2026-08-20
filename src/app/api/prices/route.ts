import { NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/prices
 *
 * Returns a 10-coin price ticker for the top bar.
 *
 * Strategy (Phase 27):
 *  - PRIMARY: Use CMC listings data (already cached, no rate-limit)
 *  - FALLBACK: If CMC is unavailable, use CoinGecko
 *
 * Why this change:
 *  - CoinGecko free tier: 30 calls/min — easily rate-limited
 *  - CMC keyless API: no rate-limit for our usage
 *  - /api/market/cmc-listings already fetches top 100 coins
 *  - We just filter the top 10 and return them here
 *  - This means ZERO additional upstream calls to CoinGecko
 *
 * Caching: edge-cached 60s (same as before), in-memory cache 5min.
 */

// In-memory cache for fallback
let cached: { coins: unknown[]; fetchedAt: string } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const TICKER_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP",
  "ADA", "DOGE", "AVAX", "TRX", "LINK",
];

export async function GET() {
  // Try to get data from our own CMC listings endpoint (already edge-cached)
  try {
    // Use internal fetch to leverage edge cache
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    // Fetch from our own CMC listings — this is edge-cached and shared
    // with the market table, so it's essentially free
    const cmcRes = await fetch(
      `${baseUrl}/api/market/cmc-listings?limit=20`,
      {
        // Use cache to leverage edge cache
        cache: "force-cache",
        headers: { Accept: "application/json" },
      }
    ).catch(() => null);

    if (cmcRes && cmcRes.ok) {
      const cmcData = await cmcRes.json();
      const allCoins = cmcData?.coins || [];

      // Filter to our ticker symbols and take top 10
      const tickerCoins = TICKER_SYMBOLS.map(sym =>
        allCoins.find((c: { symbol: string }) =>
          c.symbol?.toUpperCase() === sym
        )
      ).filter(Boolean).slice(0, 10);

      if (tickerCoins.length >= 5) {
        const coins = tickerCoins.map((c: any) => ({
          id: c.slug || c.symbol?.toLowerCase() || "",
          symbol: c.symbol?.toUpperCase() || "",
          name: c.name || "",
          image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
          price: c.price || 0,
          change24h: c.percentChange24h || 0,
          marketCap: c.marketCap || 0,
          volume: c.volume24h || 0,
        }));

        cached = { coins, fetchedAt: new Date().toISOString() };

        return NextResponse.json(
          { coins, fetchedAt: new Date().toISOString() },
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          }
        );
      }
    }
  } catch {
    // CMC fetch failed — fall through to CoinGecko fallback
  }

  // Fallback: Use in-memory cache if fresh
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

  // Last resort: CoinGecko (rate-limited, but better than empty)
  try {
    const COIN_IDS = [
      "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
      "cardano", "dogecoin", "avalanche-2", "tron", "chainlink",
    ];
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(
      ","
    )}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`CoinGecko HTTP ${res.status}`);
    }

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

    cached = { coins, fetchedAt: new Date().toISOString() };

    return NextResponse.json(
      { coins, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    // Return cached data if available, even if stale
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

    return NextResponse.json(
      {
        error: "Failed to fetch prices",
        message: err instanceof Error ? err.message : "unknown",
        coins: [],
      },
      { status: 200 }
    );
  }
}
