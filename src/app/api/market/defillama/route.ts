import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/defillama?type=chains|protocols|tvl
 *
 * Returns data from DefiLlama's free, no-API-key, no-rate-limit API.
 *
 * Endpoints:
 *   - type=chains    → /v2/chains (TVL per chain)
 *   - type=protocols → /v2/protocols (TVL per protocol)
 *   - type=tvl       → /v2/tvl (aggregate TVL history)
 *   - type=stablecoins → /v2/stablecoins (stablecoin market caps)
 *
 * DefiLlama is the most permissive DeFi data API:
 *   - No API key
 *   - No rate limit
 *   - CORS enabled
 *   - Free forever
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 * DeFi TVL data changes slowly, so 5 min cache is plenty fresh.
 */

const FETCH_TIMEOUT_MS = 10000;

const ENDPOINTS: Record<string, string> = {
  chains: "https://api.llama.fi/v2/chains",
  protocols: "https://api.llama.fi/v2/protocols",
  tvl: "https://api.llama.fi/v2/tvl",
  stablecoins: "https://api.llama.fi/v2/stablecoins",
  // Per-chain TVL history
  // https://api.llama.fi/v2/historicalChainTvl/{chain}
  // Per-protocol TVL
  // https://api.llama.fi/v2/protocol/{protocol}
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "chains";

  // Allow direct path passthrough for /v2/protocol/{name} etc.
  const path = searchParams.get("path");

  let url: string;
  if (path) {
    // Sanitize: only allow alphanumeric, hyphens, underscores, slashes
    const safePath = path.replace(/[^a-z0-9\-_\/]/gi, "").toLowerCase();
    if (!safePath || safePath.length > 128) {
      return NextResponse.json(
        { error: "Invalid path parameter" },
        { status: 400 }
      );
    }
    url = `https://api.llama.fi/v2/${safePath}`;
  } else if (ENDPOINTS[type]) {
    url = ENDPOINTS[type];
  } else {
    return NextResponse.json(
      { error: `Unknown type '${type}'. Use: chains, protocols, tvl, stablecoins, or path=...` },
      { status: 400 }
    );
  }

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
      },
    });

    if (!res.ok) {
      throw new Error(`DefiLlama API returned HTTP ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
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
