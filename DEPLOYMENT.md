# Deployment Guide — Ai Crypto Discovery

This guide covers deploying the project to **Cloudflare Workers** (free tier, via @opennextjs/cloudflare).

> **Migration note**: This project was previously deployed on Cloudflare Pages with the now-deprecated `@cloudflare/next-on-pages` adapter. As of August 2026, it uses the official `@opennextjs/cloudflare` adapter on Cloudflare Workers. The Worker size dropped from 10.6 MiB (over both free and paid limits) to 1.36 MiB gzip (well under the 3 MiB free limit).

---

## Prerequisites

1. A GitHub account with the repo pushed
2. A Cloudflare account (free — **no credit card required**)
3. Node.js 22+ installed locally (Cloudflare Workers Builds uses Node 24)

---

## Option 1: Cloudflare Workers Builds (Recommended)

This is the easiest method — Cloudflare auto-builds on every push to `main`.

### Step 1: Create the Worker

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create** → **Worker** → **Connect to Git repository**
3. Select the `Russia24x/AiCryptoDiscoveryFeed` repository
4. Choose a Worker name (e.g., `aidiscovery`)

### Step 2: Build Configuration

| Setting | Value |
|---|---|
| **Production branch** | `main` |
| **Build command** | `npm install && npm run build && npm run build:worker` |
| **Deploy command** | `npx wrangler deploy` |
| **Root directory** | `/` |

> **Important**: Do NOT use `npx @opennextjs/cloudflare build` directly in the build command — it triggers an npx cache download that can't find `wrangler`. The `npm run build:worker` script uses the locally-installed binary instead.

### Step 3: Runtime Settings

In the Worker's **Settings** → **Runtime**:

- **Compatibility date**: `2026-08-18` (or later)
- **Compatibility flags**: `nodejs_compat`, `global_fetch_strictly_public`

These are already set in `wrangler.jsonc`, but verify in the dashboard.

### Step 4: Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (~30-60 seconds)
3. Visit `https://<worker-name>.<your-subdomain>.workers.dev`

If you see "Hello world" instead of your app, the new version was uploaded but not promoted to production. Go to **Deployments** → find the latest version → click **"Deploy to production"** (or "Promote").

---

## Option 2: Manual CLI Deploy

For full control, deploy from your local machine:

```bash
# 1. Install dependencies
npm install

# 2. Login to Cloudflare (one-time, opens browser)
npx wrangler login

# 3. Build Next.js + OpenNext Worker
npm run build
npm run build:worker

# 4. Deploy to Cloudflare Workers
npx wrangler deploy
```

The first deploy will create the Worker automatically. Subsequent deploys update it.

---

## Local Preview

Test the Worker locally before deploying:

```bash
npm run preview
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare preview`, which starts the app in `workerd` (the actual Cloudflare runtime). Visit `http://localhost:8787`.

---

## Free Tier Limits

| Resource | Free Tier Limit | This Project's Usage |
|---|---|---|
| **Worker size (gzip)** | 3 MiB | **1.36 MiB** ✅ |
| **Worker requests/day** | 100,000 | varies |
| **CPU time per request** | 10 ms | most routes < 50 ms |
| **Workers Static Assets** | 20 MiB total | ~1 MiB ✅ |
| **R2 storage** | 10 GB | **not used** (no card required) |
| **KV reads** | 100,000/day | not used |
| **Build minutes** | unlimited | ~60s per build |

### Cost: $0/month

The project is designed to run entirely on the free tier without a credit card.

---

## Configuration Files

### `wrangler.jsonc`

The Worker configuration. Key fields:

```jsonc
{
  "name": "aidiscovery",                    // Worker name in Cloudflare
  "main": ".open-next/worker.js",          // Entry point (built by OpenNext)
  "compatibility_date": "2026-08-18",      // Recent date for latest features
  "compatibility_flags": [
    "nodejs_compat",                        // Node.js API support
    "global_fetch_strictly_public"          // Prevent internal URL fetches
  ],
  "assets": {
    "directory": ".open-next/assets",      // Static assets
    "binding": "ASSETS"                     // Worker binding name
  }
  // No r2_buckets binding — project is local-first
}
```

### `open-next.config.ts`

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incrementalCache override — all pages are "use client" and all API
// routes are force-dynamic, so Next.js Incremental Cache is never invoked.
// This keeps the project local-first and avoids R2 (which requires a card).
export default defineCloudflareConfig({});
```

### `next.config.ts`

- `initOpenNextCloudflareForDev()` — enables local Cloudflare bindings in dev
- `images.unoptimized = true` — Cloudflare Workers doesn't support the default sharp-based optimizer
- `experimental.optimizePackageImports` — tree-shake lucide-react and framer-motion

---

## Troubleshooting

### "Hello world" instead of my app

The new Worker version was uploaded but not promoted to production:
1. Go to **Workers & Pages → your Worker → Deployments**
2. Find the latest version
3. Click **"Deploy to production"** (or "Promote")

Or change the **Deploy command** from `npx wrangler versions upload` to `npx wrangler deploy` and trigger a new build.

### "Worker exceeded the size limit of 3 MiB"

Run `npx wrangler deploy --dry-run` to see the gzipped size. If over 3 MiB:
- Check for heavy barrel imports (use `experimental.optimizePackageImports`)
- Replace Node SDKs with raw `fetch` calls
- Audit the bundle: `cd .open-next/server-functions/default && cat handler.mjs | esbuild --analyze`

### "Cannot find package 'wrangler'"

You're using `npx @opennextjs/cloudflare build` instead of `npm run build:worker`. The `npx` approach downloads a fresh copy to the npx cache that doesn't have access to your project's `wrangler` install. Always use `npm run build:worker` (which uses the local binary).

### "Failed to produce a Cloudflare Pages build"

This error appears if you're still using the old `@cloudflare/next-on-pages` adapter. Make sure:
- `wrangler.jsonc` exists (not `wrangler.toml`)
- Build command is `npm run build && npm run build:worker` (not `npx @cloudflare/next-on-pages`)
- All `export const runtime = "edge"` lines are removed from source

### Hydration mismatch errors

If you see "Hydration failed because the server rendered HTML didn't match the client":
- Check that `useMounted()` is used to gate renders that depend on `localStorage` or `window`
- Verify `useSyncExternalStore` is used (not the `useEffect(() => setState(), [])` pattern)

### CoinGecko rate-limited (429)

The free CoinGecko API allows 30 requests/min. When rate-limited:
- The market page falls back to CoinMarketCap data (with an amber "Limited data" banner)
- The coin detail page falls back to CMC coin metadata
- No action needed — the app continues to work with reduced data

### iran-tether shows "unavailable"

Wallex and Nobitex APIs are geoblocked from Cloudflare Workers (US/EU regions). This is a network limitation, not a code bug. The Toman price will show "ناموجود" until a proxy solution is implemented.

---

## Architecture Notes

- **No database**: All user data (bookmarks, watchlist, theme, language, search history) is in browser `localStorage`
- **No server sessions**: Each request is stateless
- **Edge caching**: API routes use `Cache-Control: s-maxage=X, stale-while-revalidate=Y` headers
- **In-memory cache**: API routes have a module-scope `let cached = ...` fallback for when upstreams fail
- **TanStack Query**: Client-side cache with `staleTime` per query (30s-30min depending on data freshness)
- **Service Worker v2**: Offline-first with per-route caching and LRU eviction

---

## Useful Commands

```bash
# Local development
npm run dev                    # Next.js dev server on :3000
npm run preview                # workerd runtime on :8787 (production-fidelity)

# Build
npm run build                  # next build → .next/
npm run build:worker           # opennextjs-cloudflare build → .open-next/

# Deploy
npm run deploy                 # build + wrangler deploy
npx wrangler deploy --dry-run # check size without deploying

# Type checking
npx tsc --noEmit               # TypeScript check
npm run lint                   # ESLint (0 errors, 4 warnings expected)

# Cloudflare types
npm run cf-typegen             # Generate cloudflare-env.d.ts from wrangler.jsonc
```
