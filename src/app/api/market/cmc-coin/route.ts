import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/cmc-coin?slug=bitcoin
 *
 * Returns single coin metadata from CoinMarketCap's keyless API.
 *
 * Endpoint: https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail
 *
 * Returns:
 *   - name, symbol, slug, logo, description
 *   - tags, platform, category
 *   - URLs (website, twitter, reddit, github, etc.)
 *   - isAudited, auditInfoList
 *   - circulatingSupply, totalSupply, maxSupply
 *
 * Caching: edge-cached 300s (5 min), stale-while-revalidate 900s.
 * Coin metadata changes infrequently.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json(
      { error: "Missing 'slug' query parameter (e.g. ?slug=bitcoin)" },
      { status: 400 }
    );
  }

  // Sanitize: only allow alphanumeric, hyphens
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!safeSlug || safeSlug.length > 64) {
    return NextResponse.json(
      { error: "Invalid slug format" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?slug=${safeSlug}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`CMC coin detail API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const coin = data?.data;

    if (!coin) {
      return NextResponse.json(
        { error: "Coin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(coin, {
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
  }
}
