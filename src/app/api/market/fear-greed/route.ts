import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createFallbackCache } from "@/lib/fallback-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/fear-greed
 *
 * Returns the Crypto Fear & Greed Index from alternative.me.
 *
 *   {
 *     "value": 41,                       // 0-100
 *     "classification": "Fear",          // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
 *     "yesterday": 38,
 *     "lastWeek": 42,
 *     "fetchedAt": "..."
 *   }
 *
 * Caching: alternative.me updates once per hour. We cache aggressively
 * (15 min edge, 30 min stale) to be a good citizen and avoid their
 * rate limiter (which triggers on >5 req/min).
 *
 * We also keep an in-memory cache as fallback for when the upstream
 * is down (so the UI always shows something).
 */

interface FngData {
  value: number;
  classification: string;
  yesterday?: number;
  lastWeek?: number;
  fetchedAt: string;
  cached?: boolean;
}

const cache = createFallbackCache<FngData>();

const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

/**
 * Map the numeric value (0-100) to an emoji-friendly face.
 * - 0-24:    Extreme Fear  😨
 * - 25-44:   Fear          😟
 * - 45-55:   Neutral       😐
 * - 56-75:   Greed         🙂
 * - 76-100:  Extreme Greed 🤩
 */
export function fngEmoji(value: number): string {
  if (value <= 24) return "😨";
  if (value <= 44) return "😟";
  if (value <= 55) return "😐";
  if (value <= 75) return "🙂";
  return "🤩";
}

/** Tailwind-friendly color for the value. */
export function fngColor(value: number): string {
  if (value <= 24) return "#ef4444"; // red
  if (value <= 44) return "#f97316"; // orange
  if (value <= 55) return "#eab308"; // yellow
  if (value <= 75) return "#84cc16"; // lime
  return "#22c55e"; // green
}

export async function GET() {
  try {
    const res = await fetchWithTimeout("https://api.alternative.me/fng/?limit=8", {
      headers: {
        Accept: "application/json",
        "User-Agent": "AiCryptoDiscoveryBot/1.0",
      },
      timeoutMs: FETCH_TIMEOUT_MS,
    });
    if (res.ok) {
      const json = await res.json();
      const arr = json?.data;
      if (Array.isArray(arr) && arr.length > 0) {
        const today = arr[0];
        const yesterday = arr[1];
        const lastWeek = arr[7];
        const value = Number(today.value);
        if (Number.isFinite(value)) {
          const result: FngData = {
            value,
            classification: String(today.value_classification || ""),
            yesterday: yesterday ? Number(yesterday.value) : undefined,
            lastWeek: lastWeek ? Number(lastWeek.value) : undefined,
            fetchedAt: new Date().toISOString(),
          };
          cache.set(result);
          return NextResponse.json(result, {
            headers: {
              "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
            },
          });
        }
      }
    }
  } catch {
    // fall through to cache
  }

  const cachedEntry = cache.get();
  if (cachedEntry && cache.isFresh(CACHE_TTL_MS)) {
    return NextResponse.json(
      { ...cachedEntry.data, cached: true, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  }

  return NextResponse.json(
    {
      error: "Failed to fetch Fear & Greed Index",
      fetchedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
