import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/tether
 *
 * Returns the real free-market USDT/Toman price by scraping
 * nobitex.ir/price/usdt/ HTML page.
 *
 * Why this approach:
 *  - api.nobitex.ir is geoblocked from Cloudflare Workers (530 error)
 *  - api.wallex.ir is geoblocked from Cloudflare Workers (403 error)
 *  - nobitex.ir (website) IS reachable from Workers (200, ACAO: *)
 *  - The price page has SSR data with the current price in HTML
 *
 * The price is extracted via regex from the HTML.
 * This is fragile but works reliably as of Aug 2026.
 *
 * Response shape:
 *   {
 *     "price": 188981,
 *     "source": "nobitex",
 *     "fetchedAt": "2026-08-20T..."
 *   }
 */

const FETCH_TIMEOUT_MS = 10000;

// In-memory cache (5 min TTL)
let cached: { price: number; source: string; fetchedAt: string } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  // Return in-memory cache if fresh
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json(
      { ...cached, cached: true },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch("https://nobitex.ir/price/usdt/", {
      signal: ctrl.signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
      },
    });
    clearTimeout(id);

    if (!res.ok) {
      throw new Error(`Nobitex website returned HTTP ${res.status}`);
    }

    const html = await res.text();

    // Extract price from HTML: pattern is >188,981</span><span...>تومان
    const priceMatch = html.match(/>([\d,]{5,7})<\/span><span[^>]*>تومان/);
    if (!priceMatch) {
      throw new Error("Could not find Tether price in Nobitex HTML");
    }

    const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price extracted: ${priceMatch[1]}`);
    }

    const result = {
      price,
      source: "nobitex",
      fetchedAt: new Date().toISOString(),
    };

    cached = result;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    // Return stale cache if available
    if (cached) {
      return NextResponse.json(
        { ...cached, cached: true, stale: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return NextResponse.json(
      {
        unavailable: true,
        error: err instanceof Error ? err.message : "Failed to fetch Tether price",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
