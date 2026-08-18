import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/top-gainers?limit=10
 *
 * Returns the top N cryptocurrencies by 24h percent change.
 *
 * This is a thin wrapper around our own /api/market/cmc-listings route
 * with sortBy=percent_change_24h&sortType=desc. We don't call CMC directly
 * here so that the edge cache can serve a single response to many users
 * (CMC's keyless API throttles by IP — calling it from every page view
 * would risk getting our server IP blocked).
 *
 * Response shape: same as /api/market/cmc-listings but with
 * sortBy=percent_change_24h baked in.
 *
 * Filter: coins with percentChange24h > 5% (to filter out noise from
 * stablecoins with tiny fluctuations). Top gainers usually have >5%.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch from our own cmc-listings route (which is edge-cached).
    // This way we get dedup + cache benefits.
    const url = new URL("/api/market/cmc-listings", request.url);
    url.searchParams.set("limit", String(limit * 2)); // fetch more, then filter
    url.searchParams.set("sortBy", "percent_change_24h");
    url.searchParams.set("sortType", "desc");

    const res = await fetch(url.toString(), {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Upstream returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const coins = (data?.coins || []).filter(
      (c: { percentChange24h: number; volume24h: number }) =>
        c.percentChange24h > 5 && c.volume24h > 100000
    );

    return NextResponse.json(
      {
        coins: coins.slice(0, limit),
        count: coins.length,
        fetchedAt: new Date().toISOString(),
      },
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
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
