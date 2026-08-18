# Deployment Guide — Ai Crypto Discovery

This guide covers deploying the project to **Cloudflare Pages** (free tier).

---

## Prerequisites

1. A GitHub account with the repo pushed
2. A Cloudflare account (free)
3. Node.js 18+ installed locally

---

## Option 1: Cloudflare Pages Dashboard (Recommended)

### Step 1: Connect Repository

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Select the `Russia24x/AiCryptoDiscoveryFeed` repository
4. Choose a project name (e.g., `ai-crypto-discovery`)

### Step 2: Build Configuration

| Setting | Value |
|---|---|
| **Framework preset** | Next.js |
| **Build command** | `npx @cloudflare/next-on-pages@1` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | (leave empty) |
| **Environment variables** | (none required — see note below) |

### Step 3: Advanced Settings

In the Cloudflare Pages dashboard, under **Settings** → **Functions**:

- **Compatibility flags**: `nodejs_compat`
- **Compatibility date**: `2024-09-25` or later

These are already configured in `wrangler.toml`.

### Step 4: Deploy

Click **Save and Deploy**. Cloudflare will:
1. Clone the repo
2. Run `npm install --legacy-peer-deps` (using `.npmrc`)
3. Run `npx @cloudflare/next-on-pages@1`
4. Deploy the output to global Cloudflare CDN

**Build time**: ~3-5 minutes

---

## Option 2: Wrangler CLI

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build
npx @cloudflare/next-on-pages@1

# Deploy
wrangler pages deploy .vercel/output/static --project-name=ai-crypto-discovery
```

---

## Important Notes

### 1. Edge Runtime
All API routes use `export const runtime = "edge"`. This is **required** for Cloudflare Pages — the Node.js runtime is not available.

### 2. Image Optimization
`next.config.ts` has `images.unoptimized: true` because Cloudflare Pages doesn't support the default Next.js image optimizer. Images are served as-is.

### 3. Peer Dependencies
`.npmrc` contains `legacy-peer-deps=true` because `@cloudflare/next-on-pages` has a peer dependency on Next.js ≤15.5.2, but we use Next.js 16. The adapter works fine despite the warning.

### 4. Environment Variables
**No environment variables are required**. All API keys are handled via keyless public APIs:
- CoinMarketCap: `data-api/v3/*` (keyless)
- CoinGecko: free tier (30 calls/min, no key)
- DefiLlama: no key, no rate limit
- Binance: public ticker (no key)
- Open-Meteo: free (10K calls/day, no key)

### 5. Free Tier Limits

| Resource | Free Tier Limit | Our Usage |
|---|---|---|
| Builds | 500/month | ~10/month |
| Bandwidth | Unlimited | — |
| Requests | Unlimited | — |
| Functions invocations | 20,000/day | ~5,000/day (with caching) |
| Edge cache | Unlimited | — |

**How we stay within limits:**
- All API routes are edge-cached (60s-900s depending on data freshness)
- TanStack Query adds client-side caching (30s-15min staleTime)
- In-memory fallback cache when upstream APIs fail
- No polling on server — all polling is client-side via TanStack Query

### 6. Iranian API Geo-blocking

Some APIs are geo-blocked from certain Cloudflare PoPs:
- **Binance**: blocked from US PoPs → fallback chain: Binance → Coinbase → CoinGecko
- **Wallex/Nobitex**: may be blocked from US PoPs → returns `unavailable: true` (UI shows "ناموجود")
- **CoinGecko**: rate-limited (30 calls/min) → retry with exponential backoff + in-memory cache

This is by design — the fallback chains ensure the app works globally.

### 7. TypeScript Strict Mode

`tsconfig.json` has `strict: true` and `next.config.ts` has `ignoreBuildErrors: false`. The build will **fail** on any TypeScript error. This is intentional — it catches bugs before they reach production.

---

## Custom Domains

After deployment, you can add a custom domain in the Cloudflare Pages dashboard:
1. Go to **Custom domains** → **Set up a custom domain**
2. Enter your domain (e.g., `ai-crypto-discovery.pages.dev`)
3. Cloudflare will configure DNS and SSL automatically

---

## Monitoring

- **Cloudflare Analytics**: Available in the dashboard (requests, bandwidth, function invocations)
- **TanStack Query DevTools**: Available in development mode (floating button at bottom-left)
- **Console logs**: Check browser console for any runtime errors

---

## Troubleshooting

### Build Fails
1. Check that `npm install --legacy-peer-deps` succeeds locally
2. Check that `npx tsc --noEmit` returns 0 errors
3. Check that `npm run build` succeeds locally
4. Check Cloudflare Pages build logs for specific errors

### API Routes Return 500
1. Check that all routes have `export const runtime = "edge"`
2. Check Cloudflare Functions logs in the dashboard
3. Some upstream APIs may be temporarily down — check their status pages

### Images Don't Load
- Images from external sources (RSS, Telegram) use `referrerPolicy: "no-referrer"` to avoid hotlink protection
- If images still don't load, it's likely the source website blocking Cloudflare IPs — not fixable on our end

---

_Last updated: 2026-08-19 — Phase 17 complete._
