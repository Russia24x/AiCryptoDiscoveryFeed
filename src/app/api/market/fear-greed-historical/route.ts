import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/fear-greed-historical?days=30
 *
 * Returns historical Fear & Greed Index data from alternative.me.
 *
 * Endpoint: https://api.alternative.me/fng/?limit=30&format=date
 *
 * Response: array of { value, classification, timestamp, date }
 *
 * Caching: edge-cached 900s (15 min), stale-while-revalidate 1800s.
 * Historical F&G only updates hourly, so 15 min cache is plenty.
 */

const FETCH_TIMEOUT_MS = 10000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 365);

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.alternative.me/fng/?limit=${days}`,
      {
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0)",
        },
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rawData = json?.data || [];

    const data = rawData.map((item: { value: string; value_classification: string; timestamp: string; date?: string }) => ({
      value: parseInt(item.value, 10),
      classification: item.value_classification,
      timestamp: parseInt(item.timestamp, 10) * 1000,
      date: new Date(parseInt(item.timestamp, 10) * 1000).toISOString().split("T")[0],
    }));

    return NextResponse.json(
      { data, count: data.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", data: [] },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
