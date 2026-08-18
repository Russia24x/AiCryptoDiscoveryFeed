import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/iran-tether
 *
 * Returns the live Tether-to-Toman (USDT/IRT) rate, plus 24h change, by
 * aggregating multiple Iranian crypto exchange APIs. We try them in order
 * and return the first that works.
 *
 * Sources tried:
 *   1. Nobitex  — /v2/orderbook/USDT-RLS  (1 RLS = 1 IRR; 1 Toman = 10 RLS)
 *   2. Wallex    — /v1/ohlcv?symbol=USDTTMN
 *
 * If all sources fail (rate-limited or offline), we fall back to a cached
 * last-known-good value stored in module-scope memory (only used on this
 * same edge instance until it dies).
 *
 * Response shape:
 *   {
 *     "price": 65430,         // Toman per USDT
 *     "change24h": -0.42,     // percent
 *     "high24h": 65800,
 *     "low24h": 65200,
 *     "source": "nobitex",
 *     "fetchedAt": "2026-08-18T06:00:00.000Z"
 *   }
 *
 * Note: We return 200 even on fallback so the UI can render gracefully.
 */

interface TetherData {
  price: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  source: string;
  fetchedAt: string;
  cached?: boolean;
}

const FETCH_TIMEOUT_MS = 8000;

// In-memory cache for fallback when all upstreams fail
let cached: TetherData | null = null;

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
        "User-Agent":
          "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)",
        Accept: "application/json",
        ...(opts.headers || {}),
      },
    });
  } finally {
    clearTimeout(id);
  }
}

/** Try Nobitex orderbook for USDT-RLS. */
async function tryNobitex(): Promise<TetherData | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.nobitex.ir/v2/orderbook/USDT-RLS",
      {},
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const ob = data?.data;
    if (!ob) return null;
    const topBid = ob.bids?.[0]?.[0] ? Number(ob.bids[0][0]) : null;
    const topAsk = ob.asks?.[0]?.[0] ? Number(ob.asks[0][0]) : null;
    const lastTrade = ob.lastTradePrice ? Number(ob.lastTradePrice) : null;
    let price = lastTrade;
    if (price == null || !Number.isFinite(price)) {
      if (topBid != null && topAsk != null) price = (topBid + topAsk) / 2;
      else if (topBid != null) price = topBid;
      else if (topAsk != null) price = topAsk;
    }
    if (price == null || !Number.isFinite(price) || price <= 0) return null;
    // Convert RLS → Toman (1 Toman = 10 RLS)
    const priceToman = Math.round(price / 10);
    return {
      price: priceToman,
      source: "nobitex",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Try Wallex USDTTMN stats. */
async function tryWallex(): Promise<TetherData | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.wallex.ir/v1/markets",
      {},
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const symbols = data?.result?.symbols || {};
    // Look for the USDTTMN market
    for (const k of Object.keys(symbols)) {
      if (k.toUpperCase() === "USDTTMN") {
        const m = symbols[k];
        if (!m) continue;
        // Wallex uses different field names across API versions — try a bunch
        const price =
          m.lastPrice != null
            ? Number(m.lastPrice)
            : m.latestPrice != null
            ? Number(m.latestPrice)
            : m.stats?.lastPrice != null
            ? Number(m.stats.lastPrice)
            : m.stats?.latestPrice != null
            ? Number(m.stats.latestPrice)
            : null;
        if (price == null || !Number.isFinite(price) || price <= 0) continue;
        const change24h =
          m.stats?.priceChangePercent != null
            ? Number(m.stats.priceChangePercent)
            : m.priceChangePercent != null
            ? Number(m.priceChangePercent)
            : undefined;
        const high24h =
          m.stats?.highPrice != null
            ? Number(m.stats.highPrice)
            : m.highPrice != null
            ? Number(m.highPrice)
            : undefined;
        const low24h =
          m.stats?.lowPrice != null
            ? Number(m.stats.lowPrice)
            : m.lowPrice != null
            ? Number(m.lowPrice)
            : undefined;
        return {
          price: Math.round(price),
          change24h,
          high24h: high24h ? Math.round(high24h) : undefined,
          low24h: low24h ? Math.round(low24h) : undefined,
          source: "wallex",
          fetchedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback: derive Toman price of USDT from the open ER API.
 * 1 USDT ≈ 1 USD. Open ER API gives USD→IRR.
 * 1 Toman = 10 IRR, so: tetherPrice (Toman) = USD→IRR / 10.
 *
 * This isn't the true Tether price (which is driven by Iranian market
 * demand and can be 1-3% off USD), but it's a reasonable fallback when
 * Iranian crypto exchanges are unreachable.
 */
async function tryErApiFallback(): Promise<TetherData | null> {
  try {
    const res = await fetchWithTimeout(
      "https://open.er-api.com/v6/latest/USD",
      {},
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const irr = data?.rates?.IRR;
    if (!irr || !Number.isFinite(Number(irr))) return null;
    // USD→IRR, convert to Toman (/10) — close approximation of USDT/Toman
    const priceToman = Math.round(Number(irr) / 10);
    return {
      price: priceToman,
      source: "open.er-api.com (USD≈USDT approximation)",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  // Try each source in order; first success wins.
  // 1. Wallex (most accurate — direct USDTTMN market)
  // 2. Nobitex (also direct USDT-RLS orderbook)
  // 3. open.er-api.com fallback (USD≈USDT approximation)
  const sources = [tryWallex, tryNobitex, tryErApiFallback];
  for (const src of sources) {
    const result = await src();
    if (result) {
      cached = result;
      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      });
    }
  }

  // All upstreams failed — return cached value if available
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  }

  // No data anywhere
  return NextResponse.json(
    {
      error: "All upstream sources failed",
      fetchedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
