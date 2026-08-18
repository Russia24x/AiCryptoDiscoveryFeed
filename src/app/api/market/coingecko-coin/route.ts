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
 *   - Categories, platforms, hashing_algorithm
 *   - Sparkline 7d price data
 *
 * Rate-limit strategy:
 *   - CoinGecko free tier: 30 calls/min.
 *   - Edge cache (s-maxage=120): only 1 upstream call per 2 min per region.
 *   - In-memory cache: if upstream fails, serve last-known-good data.
 *   - Retry with exponential backoff: 1 retry after 1s delay on 429.
 *
 * Caching: edge-cached 120s, stale-while-revalidate 600s.
 */

const FETCH_TIMEOUT_MS = 12000;

// In-memory cache per coin ID for fallback.
const coinCache = new Map<string, { data: unknown; fetchedAt: string }>();

/** Sleep for ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  // Try up to 2 times (initial + 1 retry with exponential backoff)
  for (let attempt = 0; attempt < 2; attempt++) {
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

      clearTimeout(id);

      if (res.status === 429) {
        if (attempt < 1) {
          await sleep(1000 * Math.pow(2, attempt));
          continue;
        }
        // Final attempt also rate-limited — serve cached data if available
        const cached = coinCache.get(safeId);
        if (cached) {
          return NextResponse.json(
            { ...cached.data as object, cached: true, rateLimited: true },
            {
              status: 200,
              headers: {
                "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
              },
            }
          );
        }
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

      if (!res.ok) {
        throw new Error(`CoinGecko coin detail API returned HTTP ${res.status}`);
      }

      const data = await res.json();

      // Update in-memory cache
      coinCache.set(safeId, { data, fetchedAt: new Date().toISOString() });

      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      });
    } catch (err) {
      clearTimeout(id);
      if (attempt < 1) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      // Final attempt failed — serve cached data if available
      const cached = coinCache.get(safeId);
      if (cached) {
        return NextResponse.json(
          { ...cached.data as object, cached: true, error: err instanceof Error ? err.message : "Unknown error" },
          {
            status: 200,
            headers: {
              "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            },
          }
        );
      }
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
    }
  }

  return NextResponse.json(
    { error: "Unexpected error" },
    { status: 200 }
  );
}
