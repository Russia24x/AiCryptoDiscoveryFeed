import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/defillama-protocol?gecko_id=uniswap
 *
 * Returns DefiLlama protocol data for a specific CoinGecko coin ID.
 *
 * Strategy (local-first, rate-limit aware):
 *   1. Fetches the full /v2/protocols list from DefiLlama (edge-cached 5min)
 *   2. Finds the protocol matching the given gecko_id
 *   3. Returns that protocol's TVL, chains, category, changes
 *
 * DefiLlama has no rate limit and no API key, but the /v2/protocols
 * response is ~2MB (6600+ protocols). By edge-caching it 5min, we
 * serve all users from cache and only make 1 upstream call per 5min.
 *
 * If no matching protocol is found, returns { found: false } so the
 * UI can silently skip the DeFi section.
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 */

const FETCH_TIMEOUT_MS = 15000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const geckoId = searchParams.get("gecko_id")?.trim();

  if (!geckoId) {
    return NextResponse.json(
      { error: "Missing 'gecko_id' parameter" },
      { status: 400 }
    );
  }

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.llama.fi/v2/protocols", {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`DefiLlama protocols API returned HTTP ${res.status}`);
    }

    const protocols = await res.json();

    if (!Array.isArray(protocols)) {
      throw new Error("DefiLlama returned non-array response");
    }

    const protocol = protocols.find(
      (p: { gecko_id?: string }) => p.gecko_id === geckoId
    );

    if (!protocol) {
      return NextResponse.json(
        { found: false, gecko_id: geckoId },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
          },
        }
      );
    }

    const result = {
      found: true,
      id: protocol.id,
      name: protocol.name,
      symbol: protocol.symbol,
      category: protocol.category,
      chain: protocol.chain,
      chains: protocol.chains,
      tvl: protocol.tvl,
      change_1h: protocol.change_1h,
      change_1d: protocol.change_1d,
      change_7d: protocol.change_7d,
      gecko_id: protocol.gecko_id,
      description: protocol.description,
      url: protocol.url,
      parentProtocol: protocol.parentProtocol,
      topChains: Object.entries(protocol.chainTvls || {})
        .sort(([, a], [, b]) => {
          const aTvl = (a as { tvl?: number })?.tvl || 0;
          const bTvl = (b as { tvl?: number })?.tvl || 0;
          return bTvl - aTvl;
        })
        .slice(0, 5)
        .map(([chain, data]) => ({
          chain,
          tvl: (data as { tvl?: number })?.tvl || 0,
        })),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        found: false,
        error: err instanceof Error ? err.message : "Unknown error",
        gecko_id: geckoId,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } finally {
    clearTimeout(id);
  }
}
