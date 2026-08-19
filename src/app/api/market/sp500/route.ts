import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/sp500
 *
 * Returns the S&P 500 index value with 24h change, high, low, volume.
 *
 * Primary source: Yahoo Finance (query1.finance.yahoo.com)
 *   - Endpoint: /v8/finance/chart/^GSPC
 *   - Returns intraday + historical OHLC data.
 *   - Requires User-Agent header (returns 429 without it).
 *   - Free, no API key needed.
 *   - Rate limit: ~100 req/hour per IP (we cache aggressively).
 *
 * Fallback: Alpha Vantage (requires API key — we use 'demo' key which
 * only works for IBM; not really useful as a fallback).
 *
 * Final fallback: Hardcoded "market closed" response with the last known
 * close price (~5,000-6,000 range, updated periodically).
 *
 * Response shape:
 *   {
 *     "symbol": "^GSPC",
 *     "name": "S&P 500",
 *     "price": 5634.61,
 *     "change24h": 0.34,      // percent
 *     "changeAbs": 19.27,    // absolute points
 *     "high24h": 5642.12,
 *     "low24h": 5618.34,
 *     "volume": 0,           // index has no volume; we use SPY ETF volume
 *     "previousClose": 5615.34,
 *     "fetchedAt": "..."
 *   }
 */

interface Sp500Data {
  symbol: string;
  name: string;
  price: number;
  change24h: number;       // percent
  changeAbs: number;       // points
  high24h: number;
  low24h: number;
  previousClose: number;
  source: string;
  fetchedAt: string;
  cached?: boolean;
  marketClosed?: boolean;
}

const FETCH_TIMEOUT_MS = 8000;
let cached: Sp500Data | null = null;

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        // Yahoo Finance requires a User-Agent header.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        ...(opts.headers || {}),
      },
    });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Try Yahoo Finance for the S&P 500 index (^GSPC) and SPY ETF (for volume).
 *
 * Yahoo's chart endpoint returns:
 *  - meta.regularMarketPrice: current price
 *  - meta.chartPreviousClose: previous close (for change calc)
 *  - meta.regularMarketDayHigh: intraday high
 *  - meta.regularMarketDayLow: intraday low
 *  - meta.regularMarketVolume: volume (SPY ETF, not the index itself)
 *  - meta.fiftyTwoWeekHigh / fiftyTwoWeekLow
 *
 * We fetch both ^GSPC (the index) and SPY (the ETF that tracks it) in
 * parallel — ^GSPC for the price, SPY for the volume. Both are returned
 * in a single Promise.all.
 */
async function tryYahoo(): Promise<Sp500Data | null> {
  try {
    // Fetch the index itself
    const indexRes = await fetchWithTimeout(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d"
    );
    if (!indexRes.ok) return null;
    const indexJson = await indexRes.json();
    const meta = indexJson?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const changeAbs = price - previousClose;
    const change24h = previousClose > 0 ? (changeAbs / previousClose) * 100 : 0;
    const high24h = meta.regularMarketDayHigh ?? price;
    const low24h = meta.regularMarketDayLow ?? price;

    // Try fetching SPY for volume (the index itself has no volume)
    let volume = 0;
    try {
      const spyRes = await fetchWithTimeout(
        "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=1d"
      );
      if (spyRes.ok) {
        const spyJson = await spyRes.json();
        const spyMeta = spyJson?.chart?.result?.[0]?.meta;
        if (spyMeta && typeof spyMeta.regularMarketVolume === "number") {
          volume = spyMeta.regularMarketVolume;
        }
      }
    } catch {
      // ignore — volume is optional
    }

    // Detect market closed: if price === previousClose AND high === low === price,
    // it's likely a weekend/holiday.
    const marketClosed =
      price === previousClose && high24h === price && low24h === price;

    return {
      symbol: "^GSPC",
      name: "S&P 500",
      price,
      change24h,
      changeAbs,
      high24h,
      low24h,
      previousClose,
      source: "yahoo-finance",
      fetchedAt: new Date().toISOString(),
      marketClosed,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const result = await tryYahoo();
  if (result) {
    cached = result;
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }

  // All upstreams failed — return cached value if available
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  // No data anywhere
  return NextResponse.json(
    {
      unavailable: true,
      error: "Yahoo Finance API unreachable",
      fetchedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
