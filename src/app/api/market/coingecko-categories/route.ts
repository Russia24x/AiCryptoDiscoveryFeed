import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/coingecko-categories
 *
 * Returns cryptocurrency categories from CoinGecko's free API.
 *
 * Endpoint: https://api.coingecko.com/api/v3/coins/categories
 *
 * Returns top categories sorted by market cap, each with:
 *   id, name, market_cap, market_cap_change_24h_in_percentage,
 *   content, top_3_coins (array of image URLs), volume_24h, updated_at
 *
 * We filter to only return categories with market_cap > 0 and limit
 * to the top 30 to keep the response small.
 *
 * Caching: edge-cached 600s (10 min), stale-while-revalidate 1800s.
 * Categories change infrequently.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/categories", {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Rate limited", rateLimited: true, categories: [] },
          { status: 200 }
        );
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error("Invalid response");

    // Filter to categories with market cap > 0, sort by market cap desc, take top 30
    const categories = raw
      .filter((c: { market_cap: number | null }) => c.market_cap && c.market_cap > 0)
      .sort((a: { market_cap: number }, b: { market_cap: number }) => b.market_cap - a.market_cap)
      .slice(0, 30)
      .map((c: {
        id: string;
        name: string;
        market_cap: number;
        market_cap_change_24h_in_percentage: number | null;
        volume_24h: number | null;
        top_3_coins: string[];
      }) => ({
        id: c.id,
        name: c.name,
        marketCap: c.market_cap,
        marketCapChange24h: c.market_cap_change_24h_in_percentage || 0,
        volume24h: c.volume_24h || 0,
        topCoinImages: (c.top_3_coins || []).slice(0, 3),
      }));

    return NextResponse.json(
      { categories, count: categories.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", categories: [] },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
