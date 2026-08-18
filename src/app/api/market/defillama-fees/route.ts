import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/defillama-fees?gecko_id=lido-dao
 *
 * Returns DefiLlama fees/revenue data for a specific CoinGecko coin ID.
 *
 * Strategy (local-first, rate-limit aware):
 *   1. Fetches /v2/protocols (edge-cached 5min) → finds protocol name by gecko_id
 *   2. Fetches /overview/fees (edge-cached 5min) → finds protocol fees by name match
 *   3. Returns fees data: total24h, total7d, total30d, total1y, totalAllTime,
 *      annualized1y, change_1d, change_7d, change_30d
 *
 * Both upstream calls are shared via edge cache — 2 calls per 5min per region,
 * regardless of how many users view different coins.
 *
 * If no matching protocol is found, returns { found: false }.
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 * DefiLlama has no rate limit and no API key.
 */

const FETCH_TIMEOUT_MS = 15000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const geckoId = searchParams.get("gecko_id")?.trim();

  if (!geckoId) {
    return NextResponse.json({ error: "Missing 'gecko_id' parameter" }, { status: 400 });
  }

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch both lists in parallel (both edge-cached)
    const [protocolsRes, feesRes] = await Promise.all([
      fetch("https://api.llama.fi/v2/protocols", {
        signal: ctrl.signal,
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)" },
        redirect: "follow",
      }),
      fetch("https://api.llama.fi/overview/fees", {
        signal: ctrl.signal,
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)" },
        redirect: "follow",
      }),
    ]);

    if (!protocolsRes.ok || !feesRes.ok) {
      throw new Error(`Upstream HTTP error: protocols=${protocolsRes.status}, fees=${feesRes.status}`);
    }

    const [protocols, feesData] = await Promise.all([
      protocolsRes.json(),
      feesRes.json(),
    ]);

    // 1. Find protocol by gecko_id to get its name
    const protocol = (protocols as Array<Record<string, unknown>>).find(
      (p) => p.gecko_id === geckoId
    );

    if (!protocol) {
      return NextResponse.json(
        { found: false, gecko_id: geckoId },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
      );
    }

    const protocolName = protocol.name as string;

    // 2. Find matching fees entry by name.
    // Some protocols have multiple versions (e.g., "Uniswap" → "Uniswap V1",
    // "Uniswap V2", "Uniswap V3", "Uniswap V4"). We aggregate fees across
    // all matching versions.
    const feesProtocols = (feesData as { protocols: Array<Record<string, unknown>> }).protocols || [];

    // First try exact match
    let matchingFees = feesProtocols.filter(
      (p) => (p.name as string)?.toLowerCase() === protocolName.toLowerCase()
    );

    // If no exact match, try prefix match (e.g., "Uniswap" matches "Uniswap V3")
    if (matchingFees.length === 0) {
      matchingFees = feesProtocols.filter(
        (p) => (p.name as string)?.toLowerCase().startsWith(protocolName.toLowerCase() + " ")
      );
    }

    if (matchingFees.length === 0) {
      return NextResponse.json(
        { found: false, gecko_id: geckoId, reason: "no_fees_data" },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
      );
    }

    // 3. Aggregate fees across all matching entries (in case of versions)
    const agg = (field: string): number =>
      matchingFees.reduce((sum, p) => sum + (Number(p[field]) || 0), 0);

    const result = {
      found: true,
      gecko_id: geckoId,
      name: matchingFees[0].name as string,
      slug: matchingFees.length === 1 ? matchingFees[0].slug : null,
      category: matchingFees[0].category as string,
      protocolType: matchingFees[0].protocolType as string,
      matchedVersions: matchingFees.length,
      // Fees (aggregated across versions if multiple)
      fees24h: agg("total24h"),
      fees7d: agg("total7d"),
      fees30d: agg("total30d"),
      fees1y: agg("total1y"),
      feesAllTime: agg("totalAllTime"),
      annualizedFees: agg("annualized1y"),
      monthlyAverageFees: agg("monthlyAverage1y"),
      // Changes (from first matching entry — they usually have similar trends)
      change1d: Number(matchingFees[0].change_1d) || 0,
      change7d: Number(matchingFees[0].change_7d) || 0,
      change30d: Number(matchingFees[0].change_30d) || 0,
      change1m: Number(matchingFees[0].change_1m) || 0,
      // Metadata
      logo: matchingFees[0].logo,
      methodologyURL: matchingFees[0].methodologyURL,
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  } catch (err) {
    return NextResponse.json(
      { found: false, error: err instanceof Error ? err.message : "Unknown error", gecko_id: geckoId },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } finally {
    clearTimeout(id);
  }
}
