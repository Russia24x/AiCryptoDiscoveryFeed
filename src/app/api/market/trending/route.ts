import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/trending
 *
 * Returns trending cryptocurrencies from CoinGecko's free API.
 *
 * Endpoint: https://api.coingecko.com/api/v3/search/trending
 *
 * Returns the top 7-15 most searched coins on CoinGecko in the last 24h.
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Rate limited", rateLimited: true, coins: [] },
          { status: 200 }
        );
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const rawCoins = json?.coins || [];

    const coins = rawCoins.map((entry: { item: { id: string; coin_id: number; name: string; symbol: string; market_cap_rank: number; thumb: string; small: string; large: string; slug: string; price_btc: number; score: number; } }) => ({
      id: entry.item.id,
      name: entry.item.name,
      symbol: entry.item.symbol,
      marketCapRank: entry.item.market_cap_rank,
      thumb: entry.item.thumb,
      score: entry.item.score,
      priceBtc: entry.item.price_btc,
    }));

    return NextResponse.json(
      { coins, count: coins.length, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", coins: [] },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
