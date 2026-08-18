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
  price: number;        // Toman per USDT
  change24h?: number;
  high24h?: number;
  low24h?: number;
  /** 24h base asset volume (USDT) */
  volume24h?: number;
  /** 24h quote asset volume (Toman) */
  quoteVolume24h?: number;
  /** Best bid price (Toman) */
  bidPrice?: number;
  /** Best ask price (Toman) */
  askPrice?: number;
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
        const stats = m.stats || {};
        const price =
          stats.lastPrice != null ? Number(stats.lastPrice) :
          m.lastPrice != null ? Number(m.lastPrice) :
          m.latestPrice != null ? Number(m.latestPrice) :
          null;
        if (price == null || !Number.isFinite(price) || price <= 0) continue;

        // Wallex's 24h change field is "24h_ch" (a number, not a string)
        const change24h =
          stats["24h_ch"] != null ? Number(stats["24h_ch"]) :
          stats.priceChangePercent != null ? Number(stats.priceChangePercent) :
          undefined;

        const high24h =
          stats["24h_highPrice"] != null ? Number(stats["24h_highPrice"]) :
          stats.highPrice != null ? Number(stats.highPrice) :
          m.highPrice != null ? Number(m.highPrice) :
          undefined;

        const low24h =
          stats["24h_lowPrice"] != null ? Number(stats["24h_lowPrice"]) :
          stats.lowPrice != null ? Number(stats.lowPrice) :
          m.lowPrice != null ? Number(m.lowPrice) :
          undefined;

        const volume24h =
          stats["24h_volume"] != null ? Number(stats["24h_volume"]) :
          stats.volume != null ? Number(stats.volume) :
          undefined;

        const quoteVolume24h =
          stats["24h_quoteVolume"] != null ? Number(stats["24h_quoteVolume"]) :
          stats.quoteVolume != null ? Number(stats.quoteVolume) :
          undefined;

        const bidPrice =
          stats.bidPrice != null ? Number(stats.bidPrice) : undefined;
        const askPrice =
          stats.askPrice != null ? Number(stats.askPrice) : undefined;

        return {
          price: Math.round(price),
          change24h,
          high24h: high24h ? Math.round(high24h) : undefined,
          low24h: low24h ? Math.round(low24h) : undefined,
          volume24h,
          quoteVolume24h,
          bidPrice: bidPrice ? Math.round(bidPrice) : undefined,
          askPrice: askPrice ? Math.round(askPrice) : undefined,
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

export async function GET() {
  // Try each source in order; first success wins.
  // 1. Wallex (most accurate - direct USDTTMN market)
  // 2. Nobitex (also direct USDT-RLS orderbook)
  //
  // IMPORTANT: We DO NOT fall back to open.er-api.com anymore. The previous
  // fallback returned the OFFICIAL USD->IRR rate (set by Central Bank of Iran),
  // which is 30-40% LOWER than the FREE MARKET rate that Iranian crypto
  // exchanges actually trade at. This caused the production bug where users
  // saw 134,518 Toman (official rate) instead of ~187,000 (real market rate).
  // When we can't reach Iranian exchanges, we return an explicit "unavailable"
  // status so the UI can show "ناموجود" instead of misleading the user.
  const sources = [tryWallex, tryNobitex];
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

  // All Iranian exchange upstreams failed.
  // - If we have a cached value from a recent successful fetch, use it
  //   (with a cached: true flag so the UI can show "cached").
  // - Otherwise, return unavailable: true so the UI knows to show
  //   "ناموجود" instead of misleading the user with the official USD->IRR rate.
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

  // No data anywhere - explicitly tell the UI it's unavailable.
  return NextResponse.json(
    {
      unavailable: true,
      error: "Iranian exchange APIs (Wallex, Nobitex) are unreachable from this server. Cannot provide real free-market USDT/Toman rate.",
      fetchedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
