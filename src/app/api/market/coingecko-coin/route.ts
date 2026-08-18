import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/coingecko-coin?id=bitcoin
 *
 * Returns full coin detail from CoinGecko's free API.
 *
 * Endpoint: https://api.coingecko.com/api/v3/coins/{id}
 *
 * Returns:
 *   - Basic info: id, symbol, name, description (en + fa), links
 *   - Market data: current_price, market_cap, total_volume, high/low 24h
 *   - Price changes: 1h, 24h, 7d, 14d, 30d, 60d, 200d, 1y
 *   - ATH/ATL: all-time high/low with dates and change percentages
 *   - Supply: circulating, total, max
 *   - Community data: reddit, twitter followers
 *   - Developer data: GitHub stars, forks, commits
 *   - Categories, platforms, hashing_algorithm
 *   - Tickering data (optional)
 *
 * Caching: edge-cached 120s (coin detail changes less frequently),
 * stale-while-revalidate 600s.
 */

const FETCH_TIMEOUT_MS = 12000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coinId = searchParams.get("id")?.trim();

  if (!coinId) {
    return NextResponse.json(
      { error: "Missing 'id' query parameter (e.g. ?id=bitcoin)" },
      { status: 400 }
    );
  }

  // Sanitize coin ID — only allow alphanumeric, hyphens
  const safeId = coinId.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!safeId || safeId.length > 64) {
    return NextResponse.json(
      { error: "Invalid coin ID format" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    localization: "true",
    tickers: "false",
    market_data: "true",
    community_data: "true",
    developer_data: "false",
    sparkline: "true",
  });

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${safeId}?${params}`,
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
      throw new Error(`CoinGecko coin detail API returned HTTP ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
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
