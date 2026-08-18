import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/binance-ticker
 *
 * Returns real-time price data for top cryptocurrencies from Binance.
 *
 * Symbols returned (24h ticker data):
 *   BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, TRX, LINK, DOT, MATIC, LTC, BCH
 *
 * All prices in USDT.
 *
 * Binance API:
 *  - Endpoint: https://api.binance.com/api/v3/ticker/24hr
 *  - No API key required for public ticker data.
 *  - Rate limit: 1200 requests/minute (we cache aggressively).
 *
 * Response shape:
 *   {
 *     "coins": [
 *       {
 *         "symbol": "BTC",
 *         "price": 64100.01,
 *         "change24h": 0.98,
 *         "high24h": 64610.01,
 *         "low24h": 63478.16,
 *         "volume24h": 13620.5,
 *         "quoteVolume24h": 873425000,
 *         "fetchedAt": "2026-08-18T..."
 *       },
 *       ...
 *     ],
 *     "fetchedAt": "2026-08-18T..."
 *   }
 *
 * Caching: edge-cached 10s, stale-while-revalidate 30s. The Ticker component
 * in the UI refreshes every 15s; with edge cache at 10s, we make at most one
 * upstream Binance call per 10s per region — well within rate limits.
 */

interface CoinTicker {
  symbol: string;          // e.g., "BTC"
  price: number;
  change24h: number;       // percent
  high24h: number;
  low24h: number;
  volume24h: number;      // base asset volume (BTC)
  quoteVolume24h: number; // quote asset volume (USDT)
  fetchedAt: string;
}

const SYMBOLS: Array<{ binance: string; symbol: string }> = [
  { binance: "BTCUSDT",  symbol: "BTC"  },
  { binance: "ETHUSDT",  symbol: "ETH"  },
  { binance: "BNBUSDT",  symbol: "BNB"  },
  { binance: "SOLUSDT",  symbol: "SOL"  },
  { binance: "XRPUSDT",  symbol: "XRP"  },
  { binance: "ADAUSDT",  symbol: "ADA"  },
  { binance: "DOGEUSDT", symbol: "DOGE" },
  { binance: "AVAXUSDT", symbol: "AVAX" },
  { binance: "TRXUSDT",  symbol: "TRX"  },
  { binance: "LINKUSDT", symbol: "LINK" },
  { binance: "DOTUSDT",  symbol: "DOT"  },
  { binance: "MATICUSDT", symbol: "MATIC" },
  { binance: "LTCUSDT",  symbol: "LTC"  },
  { binance: "BCHUSDT",  symbol: "BCH"  },
];

// In-memory cache for fallback when Binance is unreachable.
let cached: { coins: CoinTicker[]; fetchedAt: string } | null = null;

const FETCH_TIMEOUT_MS = 8000;

export async function GET() {
  // Build the URL — Binance allows multiple symbols via `symbols` param.
  // Format: symbols=["BTCUSDT","ETHUSDT",...]
  const symbolsParam = encodeURIComponent(
    JSON.stringify(SYMBOLS.map((s) => s.binance))
  );
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`;

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)",
      },
    });

    if (!res.ok) {
      throw new Error(`Binance API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Binance API returned non-array response");
    }

    // Map Binance response to our normalized shape
    const symbolMap = new Map(SYMBOLS.map((s) => [s.binance, s.symbol]));
    const coins: CoinTicker[] = [];

    for (const item of data) {
      const binanceSymbol = item.symbol;
      const symbol = symbolMap.get(binanceSymbol);
      if (!symbol) continue;

      const price = Number(item.lastPrice);
      const change24h = Number(item.priceChangePercent);
      const high24h = Number(item.highPrice);
      const low24h = Number(item.lowPrice);
      const volume24h = Number(item.volume);
      const quoteVolume24h = Number(item.quoteVolume);

      // Validate numbers
      if (!Number.isFinite(price) || price <= 0) continue;

      coins.push({
        symbol,
        price,
        change24h: Number.isFinite(change24h) ? change24h : 0,
        high24h: Number.isFinite(high24h) ? high24h : 0,
        low24h: Number.isFinite(low24h) ? low24h : 0,
        volume24h: Number.isFinite(volume24h) ? volume24h : 0,
        quoteVolume24h: Number.isFinite(quoteVolume24h) ? quoteVolume24h : 0,
        fetchedAt: new Date().toISOString(),
      });
    }

    if (coins.length === 0) {
      throw new Error("No valid ticker data received from Binance");
    }

    // Sort by quote volume descending (most-traded first)
    coins.sort((a, b) => b.quoteVolume24h - a.quoteVolume24h);

    const result = {
      coins,
      fetchedAt: new Date().toISOString(),
    };

    // Update in-memory cache
    cached = result;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    // Fallback to cached data if available
    if (cached) {
      return NextResponse.json(
        { ...cached, cached: true, error: err instanceof Error ? err.message : "Fetch failed" },
        {
          headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
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
      { status: 200 } // 200 so the UI can render a graceful fallback
    );
  } finally {
    clearTimeout(id);
  }
}
