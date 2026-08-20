import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {};

  // Test 1: nobitex.ir (website, behind ArvanCloud)
  try {
    const res = await fetch("https://nobitex.ir/", {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    results.nobitex_ir = {
      status: res.status,
      ok: res.ok,
      server: res.headers.get("server"),
      acao: res.headers.get("access-control-allow-origin"),
    } as any;
  } catch (e) {
    results.nobitex_ir = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 2: api.nobitex.ir (API, behind Cloudflare)
  try {
    const res = await fetch("https://api.nobitex.ir/v2/orderbook/USDT-RLS", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    results.api_nobitex_ir = {
      status: res.status,
      ok: res.ok,
    } as any;
  } catch (e) {
    results.api_nobitex_ir = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 3: Wallex
  try {
    const res = await fetch("https://api.wallex.ir/v1/markets", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    results.wallex = {
      status: res.status,
      ok: res.ok,
    } as any;
  } catch (e) {
    results.wallex = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 4: Can we fetch the nobitex.ir/price/usdt/ page and parse price?
  try {
    const res = await fetch("https://nobitex.ir/price/usdt/", {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    results.nobitex_price_page = {
      status: res.status,
      ok: res.ok,
      size: 0,
    } as any;
    if (res.ok) {
      const html = await res.text();
      (results.nobitex_price_page as any).size = html.length;
      // Look for price in the HTML
      const priceMatch = html.match(/(\d{4,6})\s*(?:تومان|Toman|IRT)/);
      if (priceMatch) {
        (results.nobitex_price_page as any).foundPrice = priceMatch[0];
      }
      // Look for JSON data
      const jsonMatch = html.match(/"lastTradedPrice":\s*"?(\d+)"?/);
      if (jsonMatch) {
        (results.nobitex_price_page as any).lastTradedPrice = jsonMatch[1];
      }
    }
  } catch (e) {
    results.nobitex_price_page = { error: e instanceof Error ? e.message : "unknown" };
  }

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
