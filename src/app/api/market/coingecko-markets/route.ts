import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/coingecko-markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1
 *
 * Returns cryptocurrency market data from CoinGecko's free API.
 *
 * Endpoint: https://api.coingecko.com/api/v3/coins/markets
 *
 * This endpoint returns:
 *   - id, symbol, name, image
 *   - current_price, market_cap, market_cap_rank
 *   - total_volume, high_24h, low_24h
 *   - price_change_24h, price_change_percentage_24h
 *   - market_cap_change_24h, market_cap_change_percentage_24h
 *   - circulating_supply, total_supply, max_supply
 *   - ath, ath_change_percentage, ath_date
 *   - atl, atl_change_percentage, atl_date
 *   - roi, last_updated, sparkline_in_7d (optional)
 *
 * Caching: edge-cached 60s, stale-while-revalidate 300s.
 * CoinGecko free tier: 30 calls/min, ~10-15 calls/min recommended.
 * With 60s edge cache, we make at most 1 call/min per region.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vsCurrency = searchParams.get("vs_currency") || "usd";
  const order = searchParams.get("order") || "market_cap_desc";
  const perPage = Math.min(parseInt(searchParams.get("per_page") || "100", 10), 250);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const sparkline = searchParams.get("sparkline") === "true";

  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order,
    per_page: String(perPage),
    page: String(page),
    sparkline: String(sparkline),
    price_change_percentage: "1h,24h,7d",
  });

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?${params}`,
      {
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: "CoinGecko rate limited. Try again in a minute.", rateLimited: true },
          {
            status: 200,
            headers: {
              "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            },
          }
        );
      }
      throw new Error(`CoinGecko markets API returned HTTP ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json(
      { coins: data, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        coins: [],
        fetchedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } finally {
    clearTimeout(id);
  }
}
