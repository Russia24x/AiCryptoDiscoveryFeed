import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter configuration.
 *
 * @see https://opennext.js.org/cloudflare/caching
 *
 * No incrementalCache override is set here on purpose: every page in this
 * app is a "use client" component (data fetching happens client-side
 * against the API routes below), and every API route under src/app/api is
 * `export const dynamic = "force-dynamic"`. Next.js's Incremental Cache
 * (the thing R2/KV would back) is never invoked anywhere in this app —
 * verified by grepping every page.tsx/route.ts in src/app. defineCloudflareConfig()
 * falls back to a no-op "dummy" cache automatically, which is fine since
 * nothing calls it.
 *
 * This keeps the project local-first and avoids R2, the one Cloudflare
 * product that requires a card on file even on its free tier — Workers +
 * Static Assets do not.
 *
 * If a page is ever converted to a real server-rendered component with
 * `fetch()` caching or `revalidate`, add the R2 (or KV) incremental cache
 * back here — see the docs link above — and re-add the r2_buckets binding
 * in wrangler.jsonc.
 */
export default defineCloudflareConfig({});
