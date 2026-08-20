import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {};
  
  // Test 1: Wallex
  try {
    const res = await fetch("https://api.wallex.ir/v1/markets", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    results.wallex = {
      status: res.status,
      ok: res.ok,
    } as any;
    if (res.ok) {
      const data = await res.json();
      const usdt = data?.result?.symbols?.USDTTMN?.stats;
      (results.wallex as any).price = usdt?.lastPrice;
      (results.wallex as any).change = usdt?.["24h_ch"];
    }
  } catch (e) {
    results.wallex = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 2: Nobitex
  try {
    const res = await fetch("https://api.nobitex.ir/v2/orderbook/USDT-RLS", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    results.nobitex = {
      status: res.status,
      ok: res.ok,
    } as any;
    if (res.ok) {
      const data = await res.json();
      (results.nobitex as any).hasData = data?.data ? true : false;
    }
  } catch (e) {
    results.nobitex = { error: e instanceof Error ? e.message : "unknown" };
  }

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
