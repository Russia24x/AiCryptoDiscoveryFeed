/**
 * fetch-with-timeout — wraps fetch() with AbortController + setTimeout.
 *
 * Used by all API routes that fetch from external upstream APIs (RSS feeds,
 * CoinGecko, CMC, Open-Meteo, Telegram, etc.). Replaces the duplicated
 * AbortController + setTimeout pattern found in 20+ route handlers.
 *
 * Usage:
 *   const res = await fetchWithTimeout(url, {
 *     headers: { Accept: "application/json" },
 *     timeoutMs: 8000,
 *   });
 *   if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *
 * The timeoutMs parameter defaults to 10000 (10s). When the timeout fires,
 * the AbortController aborts the fetch, which throws an AbortError. Callers
 * should catch this and handle it (e.g. serve cached data or return error).
 */
export async function fetchWithTimeout(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    next?: { revalidate?: number };
    redirect?: "follow" | "error" | "manual";
  } = {}
): Promise<Response> {
  const { timeoutMs = 10_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
