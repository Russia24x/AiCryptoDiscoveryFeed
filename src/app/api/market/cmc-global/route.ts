import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/cmc-global
 *
 * Returns global crypto market metrics from CoinMarketCap's keyless API.
 *
 * Endpoint: https://api.coinmarketcap.com/data-api/v3/global-metrics/quotes/latest
 *
 * Response shape:
 *   {
 *     "btcDominance": 58.86,
 *     "ethDominance": 10.48,
 *     "activeCryptoCurrencies": 8046,
 *     "activeMarketPairs": 111033,
 *     "activeExchanges": 968,
 *     "totalMarketCap": 2202409831847,
 *     "totalVolume24h": 47702869578,
 *     "altcoinMarketCap": 906078804322,
 *     "altcoinVolume24h": 28484200624,
 *     "defiMarketCap": 59965202675,
 *     "defiVolume24h": 7472224260,
 *     "stablecoinMarketCap": 279797756861,
 *     "stablecoinVolume24h": 49268580149,
 *     "derivativesVolume24h": 509715728984,
 *     "totalMarketCapYesterdayPctChange": 0.29,
 *     "totalVolume24hYesterdayPctChange": -8.33,
 *     "fetchedAt": "..."
 *   }
 *
 * Caching: edge-cached 60s, stale-while-revalidate 300s.
 */

interface GlobalMetrics {
  btcDominance: number;
  ethDominance: number;
  activeCryptoCurrencies: number;
  activeMarketPairs: number;
  activeExchanges: number;
  totalMarketCap: number;
  totalVolume24h: number;
  altcoinMarketCap: number;
  altcoinVolume24h: number;
  defiMarketCap: number;
  defiVolume24h: number;
  stablecoinMarketCap: number;
  stablecoinVolume24h: number;
  derivativesVolume24h: number;
  totalMarketCapYesterdayPctChange: number;
  totalVolume24hYesterdayPctChange: number;
  fetchedAt: string;
}

const FETCH_TIMEOUT_MS = 10000;
let cached: GlobalMetrics | null = null;

export async function GET() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      "https://api.coinmarketcap.com/data-api/v3/global-metrics/quotes/latest",
      {
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`CMC global API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const d = json?.data;
    if (!d) throw new Error("CMC global: missing data field");

    const quote = d.quotes?.[0] || {};

    const result: GlobalMetrics = {
      btcDominance: Number(d.btcDominance) || 0,
      ethDominance: Number(d.ethDominance) || 0,
      activeCryptoCurrencies: Number(d.activeCryptoCurrencies) || 0,
      activeMarketPairs: Number(d.activeMarketPairs) || 0,
      activeExchanges: Number(d.activeExchanges) || 0,
      totalMarketCap: Number(quote.totalMarketCap) || 0,
      totalVolume24h: Number(quote.totalVolume24H) || 0,
      altcoinMarketCap: Number(quote.altcoinMarketCap) || 0,
      altcoinVolume24h: Number(quote.altcoinVolume24H) || 0,
      defiMarketCap: Number(quote.defiMarketCap) || 0,
      defiVolume24h: Number(quote.defiVolume24H) || 0,
      stablecoinMarketCap: Number(quote.stablecoinMarketCap) || 0,
      stablecoinVolume24h: Number(quote.stablecoinVolume24H) || 0,
      derivativesVolume24h: Number(quote.derivativesVolume24H) || 0,
      totalMarketCapYesterdayPctChange: Number(quote.totalMarketCapYesterdayPercentageChange) || 0,
      totalVolume24hYesterdayPctChange: Number(quote.totalVolume24HYesterdayPercentageChange) || 0,
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
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
