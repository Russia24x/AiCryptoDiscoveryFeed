import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/defillama-summary?gecko_id=chainlink
 *
 * Returns full DefiLlama fees summary for a specific CoinGecko coin ID.
 *
 * Strategy (local-first, rate-limit aware):
 *   1. Fetches /v2/protocols (edge-cached 5min) → finds slug by gecko_id
 *   2. Fetches /summary/fees/{slug} (per-coin, edge-cached 5min)
 *   3. Returns: fees (24h/7d/30d/1y/allTime), annualized, monthly avg,
 *      changes, description, methodology (Revenue, HoldersRevenue,
 *      SupplySideRevenue, ProtocolRevenue text), totalDataChart (30 days)
 *
 * This endpoint provides the RICH data that /overview/fees doesn't have:
 *   - Methodology text explaining Revenue vs Fees vs HoldersRevenue
 *   - Historical fees chart data (totalDataChart)
 *   - Protocol description from DefiLlama
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 * DefiLlama has no rate limit. Two upstream calls (shared with other routes).
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
    // 1. Find the protocol slug by gecko_id
    const protocolsRes = await fetch("https://api.llama.fi/v2/protocols", {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)" },
      redirect: "follow",
    });

    if (!protocolsRes.ok) throw new Error(`Protocols API returned HTTP ${protocolsRes.status}`);
    const protocols = await protocolsRes.json();
    const protocol = (protocols as Array<Record<string, unknown>>).find((p) => p.gecko_id === geckoId);

    if (!protocol) {
      return NextResponse.json(
        { found: false, gecko_id: geckoId },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
      );
    }

    const protocolName = protocol.name as string;

    // 2. Find the matching slug in /overview/fees
    const feesRes = await fetch("https://api.llama.fi/overview/fees", {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)" },
      redirect: "follow",
    });

    if (!feesRes.ok) throw new Error(`Fees API returned HTTP ${feesRes.status}`);
    const feesData = await feesRes.json();
    const feesProtocols = (feesData as { protocols: Array<Record<string, unknown>> }).protocols || [];

    // Try exact match, then prefix match (e.g., "Uniswap" → "Uniswap V3")
    let matchingFees = feesProtocols.filter(
      (p) => (p.name as string)?.toLowerCase() === protocolName.toLowerCase()
    );
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

    // 3. Fetch /summary/fees/{slug} for the first match (gets methodology + chart)
    const slug = matchingFees[0].slug as string;
    const summaryRes = await fetch(`https://api.llama.fi/summary/fees/${slug}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)" },
      redirect: "follow",
    });

    // 4. Aggregate fees from /overview/fees (in case of multiple versions)
    const agg = (field: string): number =>
      matchingFees.reduce((sum, p) => sum + (Number(p[field]) || 0), 0);

    // Base result from overview/fees
    const result: Record<string, unknown> = {
      found: true,
      gecko_id: geckoId,
      name: matchingFees[0].name as string,
      slug,
      category: matchingFees[0].category as string,
      protocolType: matchingFees[0].protocolType as string,
      matchedVersions: matchingFees.length,
      fees24h: agg("total24h"),
      fees7d: agg("total7d"),
      fees30d: agg("total30d"),
      fees1y: agg("total1y"),
      feesAllTime: agg("totalAllTime"),
      annualizedFees: agg("annualized1y"),
      monthlyAverageFees: agg("monthlyAverage1y"),
      change1d: Number(matchingFees[0].change_1d) || 0,
      change7d: Number(matchingFees[0].change_7d) || 0,
      change30d: Number(matchingFees[0].change_30d) || 0,
      change1m: Number(matchingFees[0].change_1m) || 0,
      logo: matchingFees[0].logo,
    };

    // 5. If /summary/fees/{slug} succeeded, enrich with methodology + chart data
    if (summaryRes.ok) {
      const summary = await summaryRes.json();

      // Methodology (explains Revenue, HoldersRevenue, SupplySideRevenue, etc.)
      if (summary?.methodology && typeof summary.methodology === "object") {
        result.methodology = summary.methodology;
      }

      // Breakdown methodology (what fees/revenue categories exist)
      if (summary?.breakdownMethodology && typeof summary.breakdownMethodology === "object") {
        result.breakdownMethodology = summary.breakdownMethodology;
      }

      // Description from DefiLlama
      if (summary?.description) {
        result.description = summary.description;
      }

      // Dimensions (what data types are tracked: fees, dexs, etc.)
      if (summary?.dimensions) {
        result.dimensions = summary.dimensions;
      }

      // Historical fees chart data (last 30 days)
      if (summary?.totalDataChart && Array.isArray(summary.totalDataChart)) {
        const chart = summary.totalDataChart;
        // Only take last 30 entries to keep response small
        const last30 = chart.slice(-30);
        result.feesChart = last30.map((entry: [number, number]) => ({
          timestamp: entry[0] * 1000,
          value: entry[1],
        }));
      }
    }

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
