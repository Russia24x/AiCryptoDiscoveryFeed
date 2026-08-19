import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * OpenNext Cloudflare adapter configuration.
 *
 * @see https://opennext.js.org/cloudflare/caching
 *
 * - `incrementalCache: r2IncrementalCache` — stores ISR/SSG cache data in
 *   Cloudflare R2 (a free-tier-friendly object store). This persists cache
 *   across Worker invocations, enabling `revalidate` and fetch caching to
 *   work correctly on Cloudflare Workers.
 *
 * - We do NOT currently configure `queue` (Durable Object for time-based
 *   revalidation dedup) or `tagCache` (D1 for `revalidateTag`/`revalidatePath`)
 *   because the project's API routes are mostly `fetch()`-through with their
 *   own Cloudflare CDN caching via `cf: { cacheEverything: true, cacheTtl }`.
 *   If we later adopt Next.js ISR or `revalidateTag`, we should add:
 *     import { d1NextTagCache } from "@opennextjs/cloudflare/overrides/tag-cache/d1";
 *     import { doQueue } from "@opennextjs/cloudflare/overrides/queue/durable-object";
 *   and add a `d1_databases` binding + `durable_objects` binding in wrangler.jsonc.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
