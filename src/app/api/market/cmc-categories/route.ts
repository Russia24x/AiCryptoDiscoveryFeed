import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/cmc-categories
 *
 * Returns cryptocurrency categories from CoinMarketCap's keyless API.
 *
 * Endpoint: https://api.coinmarketcap.com/data-api/v3/cryptocurrency/category
 *
 * Returns top categories with their market cap, volume, and top coins.
 * Useful for the Market Intelligence page sidebar / filters.
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/category?start=1&limit=20",
      {
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
        },
      }
    );

    if (!res.ok) throw new Error(`CMC categories API returned HTTP ${res.status}`);
    const json = await res.json();
    const categories = json?.data?.cryptoCurrencyCategoryList || [];

    const mapped = categories.map((cat: Record<string, unknown>) => ({
      id: cat.id,
      name: cat.name,
      title: cat.title,
      description: cat.description,
      numTokens: cat.numTokens,
      marketCap: Number(cat.marketCap) || 0,
      marketCapChange: Number(cat.marketCapChange) || 0,
      volume: Number(cat.volume) || 0,
      avgPriceChange: Number(cat.avgPriceChange) || 0,
    }));

    return NextResponse.json(
      { categories: mapped, count: mapped.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
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
