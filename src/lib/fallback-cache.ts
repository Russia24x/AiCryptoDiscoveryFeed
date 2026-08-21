/**
 * fallback-cache — factory for module-scope in-memory cache.
 *
 * Used by API routes that need a fallback when the upstream API is
 * unavailable (rate-limited, timeout, 5xx). Each route gets its own
 * isolated cache instance via createFallbackCache<T>().
 *
 * Cache policy (applies consistently to all converted routes):
 * Once data is cached, it is served as a fallback indefinitely — however
 * old, as long as the isolate stays warm. The `cached: true` flag in the
 * response tells the client the data is stale. This matches the pre-refactor
 * behavior exactly ("serve whatever is cached, however stale").
 *
 * Usage:
 *   const cache = createFallbackCache<CoinGeckoData>();
 *   // ... in route handler:
 *   const cachedEntry = cache.get();
 *   if (cachedEntry) {
 *     return NextResponse.json({ ...cachedEntry.data, cached: true });
 *   }
 *   // fetch fresh data...
 *   cache.set(freshData);
 *
 * Note: On Cloudflare Workers, module-scope variables persist within a
 * single isolate. Different isolates (different regions or after idle
 * eviction) will have empty caches. This is acceptable — the edge cache
 * (s-maxage) handles cross-isolate caching.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function createFallbackCache<T>() {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): CacheEntry<T> | null {
      return entry;
    },
    set(data: T): void {
      entry = { data, timestamp: Date.now() };
    },
    clear(): void {
      entry = null;
    },
  };
}
