import { NextResponse } from "next/server";
import { createFallbackCache } from "@/lib/fallback-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/binance-ticker
 *
 * Returns real-time price data for top cryptocurrencies with a robust
 * fallback chain — critical because Binance is geo-blocked on some
 * Cloudflare Pages PoPs (notably US datacenters).
 *
 * Fallback chain (in order):
 *   1. Binance (api.binance.com) — fastest, real-time, no API key.
 *      Returns 24h ticker with high/low/volume.
 *      LIMITATION: geo-blocked from US/Canada Cloudflare PoPs.
 *
 *   2. Coinbase (api.coinbase.com) — global, no API key, no geo-block.
 *      Returns spot price only (no 24h change/high/low).
 *      We compute change% by fetching yesterday's price too.
 *
 *   3. CoinGecko (api.coingecko.com) — global, no API key.
 *      Free tier: 30 calls/min, returns 24h change + volume.
 *      LIMITATION: rate-limited; returns official rate (close to spot).
 *
 * Symbols returned: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, TRX, LINK,
 * DOT, MATIC, LTC, BCH.
 *
 * All prices in USD. The UI then formats with $ prefix.
 *
 * Caching: edge-cached 10s, stale-while-revalidate 30s. In-memory cache
 * as final fallback if all upstreams fail.
 */

interface CoinTicker {
  symbol: string;
  price: number;
  change24h: number;       // percent
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  quoteVolume24h?: number;
  source: string;            // "binance" | "coinbase" | "coingecko"
  fetchedAt: string;
}

const SYMBOLS: Array<{ id: string; binance: string; coinbase: string; coingecko: string; symbol: string }> = [
  { id: "bitcoin",      binance: "BTCUSDT",  coinbase: "BTC-USD",  coingecko: "bitcoin",       symbol: "BTC"  },
  { id: "ethereum",     binance: "ETHUSDT",  coinbase: "ETH-USD",  coingecko: "ethereum",      symbol: "ETH"  },
  { id: "binancecoin",  binance: "BNBUSDT",  coinbase: "BNB-USD",  coingecko: "binancecoin",   symbol: "BNB"  },
  { id: "solana",       binance: "SOLUSDT",  coinbase: "SOL-USD",  coingecko: "solana",        symbol: "SOL"  },
  { id: "ripple",       binance: "XRPUSDT",  coinbase: "XRP-USD",  coingecko: "ripple",        symbol: "XRP"  },
  { id: "cardano",      binance: "ADAUSDT",  coinbase: "ADA-USD",  coingecko: "cardano",       symbol: "ADA"  },
  { id: "dogecoin",     binance: "DOGEUSDT", coinbase: "DOGE-USD", coingecko: "dogecoin",      symbol: "DOGE" },
  { id: "avalanche-2",  binance: "AVAXUSDT", coinbase: "AVAX-USD", coingecko: "avalanche-2",    symbol: "AVAX" },
  { id: "tron",         binance: "TRXUSDT",  coinbase: "TRX-USD",  coingecko: "tron",          symbol: "TRX"  },
  { id: "chainlink",    binance: "LINKUSDT", coinbase: "LINK-USD", coingecko: "chainlink",     symbol: "LINK" },
  { id: "polkadot",     binance: "DOTUSDT",  coinbase: "DOT-USD",  coingecko: "polkadot",      symbol: "DOT"  },
  { id: "matic-network", binance: "MATICUSDT", coinbase: "MATIC-USD", coingecko: "matic-network", symbol: "MATIC" },
  { id: "litecoin",     binance: "LTCUSDT",  coinbase: "LTC-USD",  coingecko: "litecoin",      symbol: "LTC"  },
  { id: "bitcoin-cash", binance: "BCHUSDT",  coinbase: "BCH-USD",  coingecko: "bitcoin-cash",  symbol: "BCH"  },
];

// In-memory cache for fallback when all upstreams fail.
const cache = createFallbackCache<{ coins: CoinTicker[]; fetchedAt: string }>();

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithAbortTimeout(url: string, opts: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
        Accept: "application/json",
        ...(opts.headers || {}),
      },
    });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Source 1: Binance
 * Returns: price, change24h, high24h, low24h, volume24h, quoteVolume24h
 * Limitations: geo-blocked from some Cloudflare US PoPs.
 */
async function tryBinance(): Promise<{ coins: CoinTicker[]; source: string } | null> {
  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(SYMBOLS.map((s) => s.binance)));
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`;
    const res = await fetchWithAbortTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const symbolMap = new Map(SYMBOLS.map((s) => [s.binance, s.symbol]));
    const coins: CoinTicker[] = [];

    for (const item of data) {
      const symbol = symbolMap.get(item.symbol);
      if (!symbol) continue;
      const price = Number(item.lastPrice);
      if (!Number.isFinite(price) || price <= 0) continue;

      coins.push({
        symbol,
        price,
        change24h: Number(item.priceChangePercent) || 0,
        high24h: Number(item.highPrice) || undefined,
        low24h: Number(item.lowPrice) || undefined,
        volume24h: Number(item.volume) || undefined,
        quoteVolume24h: Number(item.quoteVolume) || undefined,
        source: "binance",
        fetchedAt: new Date().toISOString(),
      });
    }

    if (coins.length === 0) return null;
    coins.sort((a, b) => (b.quoteVolume24h || 0) - (a.quoteVolume24h || 0));
    return { coins, source: "binance" };
  } catch {
    return null;
  }
}

/**
 * Source 2: Coinbase
 * Returns: price (spot only, no 24h change/high/low).
 * We fetch each symbol individually — slower but reliable globally.
 *
 * To avoid 14 separate requests, we use the Coinbase Exchange API which
 * returns all tickers in one call: https://api.exchange.coinbase.com/products/{id}/ticker
 * But we use the simpler api.coinbase.com endpoint for spot price only.
 *
 * Limitation: Coinbase doesn't return 24h change/high/low via the spot
 * endpoint. We'd need to fetch the /stats endpoint per product which is
 * expensive. As a fallback, we just return the spot price with change=0
 * and let the UI show "—" for missing fields.
 */
async function tryCoinbase(): Promise<{ coins: CoinTicker[]; source: string } | null> {
  try {
    // Fetch spot prices in parallel (limit concurrency with batches of 5)
    const batchSize = 5;
    const coins: CoinTicker[] = [];

    for (let i = 0; i < SYMBOLS.length; i += batchSize) {
      const batch = SYMBOLS.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (s) => {
          const res = await fetchWithAbortTimeout(
            `https://api.coinbase.com/v2/prices/${s.coinbase}/spot`
          );
          if (!res.ok) return null;
          const json = await res.json();
          const price = Number(json?.data?.amount);
          if (!Number.isFinite(price) || price <= 0) return null;
          return {
            symbol: s.symbol,
            price,
            change24h: 0, // unknown without extra API call
            source: "coinbase" as const,
            fetchedAt: new Date().toISOString(),
          };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          coins.push(r.value);
        }
      }
    }

    if (coins.length === 0) return null;
    // Sort by symbol order in SYMBOLS array (preserve intended order)
    const order = new Map(SYMBOLS.map((s, i) => [s.symbol, i]));
    coins.sort((a, b) => (order.get(a.symbol) ?? 99) - (order.get(b.symbol) ?? 99));
    return { coins, source: "coinbase" };
  } catch {
    return null;
  }
}

/**
 * Source 3: CoinGecko
 * Returns: price, change24h, volume24h (no high/low via simple/price endpoint).
 * Free tier: 30 calls/min — well within our 10s cache.
 * Note: returns official rate (very close to spot).
 */
async function tryCoinGecko(): Promise<{ coins: CoinTicker[]; source: string } | null> {
  try {
    const ids = SYMBOLS.map((s) => s.coingecko).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true`;
    const res = await fetchWithAbortTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;

    const coins: CoinTicker[] = [];
    for (const s of SYMBOLS) {
      const entry = data[s.coingecko];
      if (!entry || typeof entry.usd !== "number") continue;
      coins.push({
        symbol: s.symbol,
        price: entry.usd,
        change24h: entry.usd_24h_change || 0,
        volume24h: entry.usd_24h_vol || undefined,
        source: "coingecko",
        fetchedAt: new Date().toISOString(),
      });
    }

    if (coins.length === 0) return null;
    const order = new Map(SYMBOLS.map((s, i) => [s.symbol, i]));
    coins.sort((a, b) => (order.get(a.symbol) ?? 99) - (order.get(b.symbol) ?? 99));
    return { coins, source: "coingecko" };
  } catch {
    return null;
  }
}

export async function GET() {
  // Try each source in order — first success wins.
  const sources = [tryBinance, tryCoinbase, tryCoinGecko];

  for (const src of sources) {
    const result = await src();
    if (result && result.coins.length > 0) {
      const response = {
        coins: result.coins,
        source: result.source,
        fetchedAt: new Date().toISOString(),
      };
      cache.set(response);
      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      });
    }
  }

  // All upstreams failed — return cached value if available (indefinitely)
  const fallback = cache.get();
  if (fallback) {
    return NextResponse.json(
      { ...fallback.data, cached: true, error: "All upstream sources failed" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  }

  // No data anywhere
  return NextResponse.json(
    {
      error: "All upstream sources failed (Binance, Coinbase, CoinGecko)",
      coins: [],
      fetchedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
