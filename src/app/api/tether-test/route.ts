import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {};

  // Test 1: Nobitex orderbook
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.nobitex.ir/v2/orderbook/USDT-RLS", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(id);
    results.nobitex_orderbook = {
      status: res.status,
      ok: res.ok,
      acao: res.headers.get("access-control-allow-origin"),
    } as any;
    if (res.ok) {
      const data = await res.json();
      const ob = data?.data;
      (results.nobitex_orderbook as any).lastTradePrice = ob?.lastTradePrice;
      (results.nobitex_orderbook as any).topBid = ob?.bids?.[0]?.[0];
      (results.nobitex_orderbook as any).topAsk = ob?.asks?.[0]?.[0];
    }
  } catch (e) {
    results.nobitex_orderbook = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 2: Nobitex stats (POST)
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.nobitex.ir/market/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ src_currency: "usdt", dst_currency: "rls" }),
      signal: ctrl.signal,
    });
    clearTimeout(id);
    results.nobitex_stats = {
      status: res.status,
      ok: res.ok,
      acao: res.headers.get("access-control-allow-origin"),
    } as any;
    if (res.ok) {
      const data = await res.json();
      const stats = data?.stats?.["usdt-rls"];
      (results.nobitex_stats as any).latest = stats?.latest;
      (results.nobitex_stats as any).dayChange = stats?.dayChange;
      (results.nobitex_stats as any).dayHigh = stats?.dayHigh;
      (results.nobitex_stats as any).dayLow = stats?.dayLow;
    }
  } catch (e) {
    results.nobitex_stats = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 3: Wallex markets
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.wallex.ir/v1/markets", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(id);
    results.wallex = {
      status: res.status,
      ok: res.ok,
      acao: res.headers.get("access-control-allow-origin"),
    } as any;
    if (res.ok) {
      const data = await res.json();
      const usdt = data?.result?.symbols?.USDTTMN?.stats;
      (results.wallex as any).lastPrice = usdt?.lastPrice;
      (results.wallex as any).change24h = usdt?.["24h_ch"];
    }
  } catch (e) {
    results.wallex = { error: e instanceof Error ? e.message : "unknown" };
  }

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
