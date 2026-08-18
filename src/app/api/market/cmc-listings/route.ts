import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/cmc-listings
 *
 * Returns top cryptocurrencies from CoinMarketCap's keyless public API.
 *
 * Endpoint used:
 *   https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing
 *
 * This is the same endpoint that coinmarketcap.com itself uses for its
 * homepage table. No API key required. Free, no rate limit on the keyless
 * version (CMC throttles by IP but allows reasonable usage).
 *
 * Query params (all optional):
 *   - limit: number of coins to return (default 20, max 100)
 *   - sortBy: market_cap (default) | volume_24h | percent_change_24h
 *   - sortType: desc (default) | asc
 *
 * Response shape:
 *   {
 *     "coins": [
 *       {
 *         "id": 1,
 *         "name": "Bitcoin",
 *         "symbol": "BTC",
 *         "slug": "bitcoin",
 *         "cmcRank": 1,
 *         "price": 64568.86,
 *         "volume24h": 19247906810,
 *         "marketCap": 1295994996260,
 *         "percentChange1h": -0.26,
 *         "percentChange24h": 0.32,
 *         "percentChange7d": 1.49,
 *         "percentChange30d": 0.19,
 *         "percentChange60d": 2.43,
 *         "percentChange90d": -16.82,
 *         "circulatingSupply": 20071518,
 *         "totalSupply": 20071518,
 *         "maxSupply": 21000000,
 *         "dominance": 58.84
 *       },
 *       ...
 *     ],
 *     "fetchedAt": "..."
 *   }
 *
 * Caching: edge-cached 60s, stale-while-revalidate 300s. CMC updates the
 * underlying data every ~5 min so 60s is plenty fresh. The long
 * stale-while-revalidate means users get instant responses even if the
 * upstream is slow.
 */

interface CoinListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmcRank: number;
  price: number;
  volume24h: number;
  marketCap: number;
  percentChange1h: number;
  percentChange24h: number;
  percentChange7d: number;
  percentChange30d: number;
  percentChange60d: number;
  percentChange90d: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  dominance: number;
}

const FETCH_TIMEOUT_MS = 10000;
let cached: { coins: CoinListing[]; fetchedAt: string } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const sortBy = (searchParams.get("sortBy") || "market_cap") as
    | "market_cap"
    | "volume_24h"
    | "percent_change_24h";
  const sortType = (searchParams.get("sortType") || "desc") as "desc" | "asc";

  const url = `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=${limit}&sortBy=${sortBy}&sortType=${sortType}`;

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
      throw new Error(`CMC listings API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawList = data?.data?.cryptoCurrencyList;
    if (!Array.isArray(rawList)) {
      throw new Error("CMC listings: unexpected response shape");
    }

    const coins: CoinListing[] = rawList.map((c: any) => {
      const quote = c?.quotes?.[0] || {};
      return {
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        slug: c.slug,
        cmcRank: c.cmcRank,
        price: Number(quote.price) || 0,
        volume24h: Number(quote.volume24h) || 0,
        marketCap: Number(quote.marketCap) || 0,
        percentChange1h: Number(quote.percentChange1h) || 0,
        percentChange24h: Number(quote.percentChange24h) || 0,
        percentChange7d: Number(quote.percentChange7d) || 0,
        percentChange30d: Number(quote.percentChange30d) || 0,
        percentChange60d: Number(quote.percentChange60d) || 0,
        percentChange90d: Number(quote.percentChange90d) || 0,
        circulatingSupply: Number(c.circulatingSupply) || 0,
        totalSupply: Number(c.totalSupply) || 0,
        maxSupply: c.maxSupply ? Number(c.maxSupply) : null,
        dominance: Number(quote.dominance) || 0,
      };
    });

    const result = {
      coins,
      fetchedAt: new Date().toISOString(),
    };
    cached = result;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    if (cached) {
      return NextResponse.json(
        { ...cached, cached: true, error: err instanceof Error ? err.message : "Fetch failed" },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        coins: [],
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
