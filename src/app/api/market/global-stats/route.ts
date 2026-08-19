import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/global-stats
 *
 * Returns global crypto market stats from our own edge-cached CMC global
 * route. This is a convenience wrapper that adds computed fields.
 *
 * Uses: /api/market/cmc-global (which is already edge-cached 60s)
 *
 * Returns:
 *   - totalMarketCap, totalVolume24h
 *   - btcDominance, ethDominance, othersDominance
 *   - activeCryptoCurrencies, activeExchanges
 *   - defiMarketCap, defiVolume24h
 *   - stablecoinMarketCap, stablecoinVolume24h
 *   - derivativesVolume24h
 *   - marketCapChangePct (24h)
 *   - altcoinSeasonIndex (computed from cmc-listings)
 *
 * Caching: edge-cached 60s (inherits from cmc-global).
 */

const FETCH_TIMEOUT_MS = 12000;

export async function GET(request: Request) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch global metrics from our own edge-cached route
    const globalUrl = new URL("/api/market/cmc-global", new URL(request.url).origin);
    const globalRes = await fetch(globalUrl.toString(), {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!globalRes.ok) throw new Error(`Global API returned HTTP ${globalRes.status}`);
    const global = await globalRes.json();

    const btcDom = global.btcDominance || 0;
    const ethDom = global.ethDominance || 0;
    const othersDom = Math.max(0, 100 - btcDom - ethDom);

    return NextResponse.json(
      {
        ...global,
        othersDominance: othersDom,
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
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
