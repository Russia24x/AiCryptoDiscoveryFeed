import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/altcoin-season
 *
 * Computes the Altcoin Season Index from our own CMC listings data.
 *
 * The Altcoin Season Index is a percentage (0-100) that indicates how many
 * of the top 50 altcoins (excluding stablecoins) are outperforming Bitcoin
 * over the last 24 hours.
 *   - 75+ = Altcoin Season (most altcoins beating BTC)
 *   - <25 = Bitcoin Season (most altcoins losing to BTC)
 *
 * We compute this from /api/market/cmc-listings?limit=50 — we already have
 * the data, no extra upstream call needed. Just sort by market cap, filter
 * out stablecoins, compare each altcoin's 24h change to BTC's 24h change.
 *
 * Caching: edge-cached 300s (5 min) — inherits from cmc-listings cache.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch from our own edge-cached route — no extra upstream call
    const url = new URL("/api/market/cmc-listings", "http://localhost:3000");
    url.searchParams.set("limit", "50");
    url.searchParams.set("sortBy", "market_cap");
    url.searchParams.set("sortType", "desc");

    // Use request.url to get the proper origin
    const reqUrl = new URL("/api/market/cmc-listings?limit=50&sortBy=market_cap&sortType=desc", "http://localhost:3000");
    const res = await fetch(reqUrl.toString(), {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`Upstream returned HTTP ${res.status}`);
    const data = await res.json();
    const coins: Array<{ symbol: string; percentChange24h: number; name: string }> = data?.coins || [];

    if (coins.length === 0) {
      throw new Error("No coin data available");
    }

    // Find BTC's 24h change
    const btc = coins.find((c) => c.symbol === "BTC");
    const btcChange = btc?.percentChange24h || 0;

    // Filter out stablecoins (USDT, USDC, DAI, etc.) and BTC itself
    const stablecoinSymbols = new Set([
      "USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "USDD", "FDUSD",
      "PYUSD", "USTC", "FRAX", "LUSD", "SUSDE", "USDS",
    ]);
    const altcoins = coins.filter(
      (c) => c.symbol !== "BTC" && !stablecoinSymbols.has(c.symbol)
    );

    // Count how many altcoins outperformed BTC
    const outperforming = altcoins.filter(
      (c) => c.percentChange24h > btcChange
    ).length;

    const index = altcoins.length > 0
      ? Math.round((outperforming / altcoins.length) * 100)
      : 0;

    const season =
      index >= 75
        ? "Altcoin Season"
        : index <= 25
        ? "Bitcoin Season"
        : "Neutral";

    return NextResponse.json(
      {
        index,
        season,
        btcChange24h: btcChange,
        altcoinsCount: altcoins.length,
        outperformingCount: outperforming,
        underperformingCount: altcoins.length - outperforming,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        index: 0,
        season: "Unknown",
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
