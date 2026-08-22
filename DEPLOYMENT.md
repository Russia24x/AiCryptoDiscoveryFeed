# DEPLOYMENT — Ai24Discovery

Last updated: 2026-08-22

---

## Prerequisites

- Node.js 22+
- npm (no Bun required)
- Cloudflare account (free tier is sufficient)
- `CLOUDFLARE_API_TOKEN` environment variable (set in shell, NOT in files)

---

## Build & Deploy

### One-command deploy
```bash
export CLOUDFLARE_API_TOKEN="your-token"
npm run deploy
```
This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

### Manual step-by-step
```bash
npm install                    # Install dependencies
npm run build                  # Next.js production build
npm run build:worker           # OpenNext Cloudflare Workers bundle
npx opennextjs-cloudflare deploy  # Deploy to Cloudflare
```

### GitHub Actions (auto-deploy)
The repository has a GitHub Actions workflow (`.github/workflows/`) that automatically builds and deploys on every push to `main`. No manual deploy needed — just push.

---

## Cloudflare Workers Configuration

| Setting | Value |
|---------|-------|
| Worker name | `aidiscovery` |
| Main entry | `.open-next/worker.js` |
| Compatibility date | `2026-08-18` |
| Compatibility flags | `nodejs_compat`, `global_fetch_strictly_public` |
| Assets directory | `.open-next/assets` |
| R2 buckets | None (stateless) |
| Observability | Enabled |
| Worker gzip size | ~1.36 MiB (limit: 3 MiB) |

### Production URL
https://aidiscovery.russia24x.workers.dev

---

## Architecture Notes

- **No database**: All user preferences stored in browser localStorage
- **No R2**: R2 requires a card on file even on free tier; the project is local-first
- **All pages are `"use client"`**: 100% client-rendered (SSR-safe via `useSyncExternalStore` + `useMounted`)
- **All API routes are `force-dynamic`**: Never statically rendered, always run on the Worker
- **`global_fetch_strictly_public`**: Prevents Workers from connecting to private/internal IP addresses (second layer of SSRF defense alongside `fetch-guard.ts`)

---

## Security Headers

All headers are set via `next.config.ts` `headers()` function (NOT `public/_headers`, which only applies to static assets):

| Header | Value |
|--------|-------|
| X-Frame-Options | SAMEORIGIN |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Strict-Transport-Security | max-age=63072000; includeSubDomains |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline'; ... |

---

## Service Worker

- Version: `v2.1.0-opennext`
- 4 caches: static, pages, API, images
- LRU eviction: API 50 entries, pages 20, images 100
- `/api/article` and `/api/og-image` excluded from cache (SSRF/XSS safety)
- Offline page: bilingual FA/EN
- Periodic sync: refreshes feed, prices, fear-greed

---

## Troubleshooting

### Build fails with font fetch error
Fonts are self-hosted via `@fontsource` packages — no network access to `fonts.googleapis.com` needed. If build fails, run `npm install` to ensure all `@fontsource/*` packages are installed.

### `/api/tether` returns `unavailable: true`
Nobitex.ir may be temporarily down or blocking the Worker's IP. The route scrapes `https://nobitex.ir/price/usdt/` HTML — if the page structure changes, the regex may need updating.

### CoinGecko rate-limited (429)
The app is designed to handle this gracefully:
1. `/api/prices` falls back to CMC (keyless API)
2. `/api/market/coingecko-markets` has in-memory cache + retry with backoff
3. TanStack Query `refetchOnWindowFocus` (not polling) minimizes calls

### Worker size exceeds 3 MiB
Run `npm run build:worker` and check `.open-next/worker.js` gzip size. If over 3 MiB:
- Check for new large dependencies
- Consider code-splitting or lazy imports
- 30 shadcn/ui components may include unused ones — remove with `npx shadcn-ui@latest remove <component>`

### Service Worker not updating
The SW version is in `public/sw.js` line 21: `const VERSION = "v2.1.0-opennext"`. Bump this on every deploy that changes cached assets. The activate handler deletes old-version caches automatically.
