# AUDIT — Ai24Discovery

Last updated: 2026-08-22

---

## Executive Summary

Ai24Discovery is a bilingual (Persian/English) content discovery + market intelligence platform deployed on Cloudflare Workers (free tier). The project has 124 TypeScript/TSX files, ~22,500 lines of code, 21 API routes, 10 pages, 62 components, 20 hooks, 32 RSS sources, 3 Telegram channels, 8 X/Twitter accounts, and 7 categories.

### Current Status: ✅ STABLE
- **TypeScript**: 0 errors
- **ESLint**: 0 errors, 0 warnings
- **Build**: Success (including OpenNext Cloudflare Workers build)
- **Worker gzip**: ~1.36 MiB (free tier 3 MiB limit)
- **API calls**: ~6-10/min worst case (CoinGecko limit: 30/min)
- **Security**: CSP + HSTS + SSRF guards + XSS sanitization + SW cache isolation

---

## Resolved Issues

### ✅ CRITICAL — XSS in article fallback paths
- **Was**: `decodeEntities()` converts `&lt;`→`<` in meta tags, then fallback paths injected `meta.ogImage`/`meta.ogTitle`/`meta.ogDescription` into `cleanedHtml` via raw template literals without passing through `cleanArticleHtml()`
- **Fixed**: Both fallback paths now route through `cleanArticleHtml()` (commit `5037b5e`)

### ✅ HIGH — SSRF in /api/article and /api/og-image
- **Was**: Both routes fetched arbitrary URLs with raw `fetch()` — no host validation, no timeout, no body cap
- **Fixed**: `src/lib/fetch-guard.ts` with `isBlockedHost()` (blocks private/loopback/link-local/CGNAT IPs) + `readBodyCapped()` (2MB/1MB limits). Pre-fetch + post-redirect host checks (commit `5037b5e`)

### ✅ HIGH — Rate-limiting from excessive polling
- **Was**: 6 `refetchInterval` timers + 15s `setInterval` on ticker → ~30 calls/min
- **Fixed**: Removed all `refetchInterval`s, enabled `refetchOnWindowFocus: true` globally (commit `95bba93`)

### ✅ HIGH — Article extraction incomplete
- **Was**: `findMatchingCloseTag` had a `lastIndex` bug; mihanblockchain/gamefa/digiato articles returned wrong/empty content
- **Fixed**: Tokenizer approach (commit `0c572a8`); JSON-LD extraction for JS-rendered sites (commit `0c572a8`); `imageSourceHtml` field for image harvesting when JSON-LD wins (commit `8845eb9`)

### ✅ CRITICAL — Weather city change crashed page
- **Was**: `useLocalStorage` infinite loop — `getSnapshot` returned new object each call via `JSON.parse`
- **Fixed**: Snapshot caching with `useRef` (commit `80f9ca0`)

### ✅ MEDIUM — Missing CSP/HSTS headers
- **Fixed**: Added via `next.config.ts` `headers()` function (commit `5037b5e`)

### ✅ MEDIUM — SW cache poisoning
- **Was**: Service Worker cached `/api/article` responses — XSS payload would persist across sessions
- **Fixed**: `/api/article` and `/api/og-image` excluded from cache; SW version bumped to `v2.1.0` (commits `5037b5e`, `6cc0320`)

### ✅ MEDIUM — Zoomit RSS feeds broken
- **Fixed**: `pathFilter` field on Source interface — use main feed, filter by URL path (commit `ca93d29`)

### ✅ MEDIUM — Lazy-load images silently dropped
- **Fixed**: `extractImages()` checks `data-src`, `data-lazy-src`, `data-lazy-original`, `data-original` when `src` is `data:` URI (commit `3fd02bb`)

### ✅ LOW — MiniTrend was misleading
- **Fixed**: Removed, replaced with honest "7d %" sortable column (commit `b41562b`)

### ✅ LOW — Duplicate data in Market Intelligence
- **Fixed**: Unified MarketPulse replaces Stats Bar + MarketOverview (commit `21890e5`)

---

## Remaining Issues

### 🟡 MEDIUM — No ErrorBoundary
- **Issue**: No React Error Boundary anywhere in `src/` — unhandled render errors crash the whole page
- **Impact**: Users see blank page or "This page couldn't load" with no recovery
- **Recommendation**: Add a root-level ErrorBoundary with fallback UI
- **Priority**: Phase 2

### 🟡 MEDIUM — DNS rebinding attack vector
- **Issue**: `isBlockedHost()` is hostname-string-based; a public domain that resolves to a private IP (e.g. `*.localtest.me` → `127.0.0.1`) passes the check
- **Mitigation**: Cloudflare Workers `global_fetch_strictly_public` flag blocks the actual network connection at runtime — this is a second layer of defense
- **Risk**: Only in self-hosted deployments without the flag
- **Priority**: Phase 3 (would need DNS resolution in Workers, which has API limitations)

### 🟢 LOW — Unused shadcn/ui components
- **Issue**: Some shadcn/ui components installed but not used (accordion, breadcrumb, collapsible, slider, etc.)
- **Impact**: Slight bundle size increase
- **Priority**: Phase 3

### 🟢 LOW — No automated tests
- **Issue**: No unit tests or E2E tests
- **Recommendation**: Playwright E2E for critical paths (homepage, category navigation, article reader, market table)
- **Priority**: Phase 3

### 🟢 LOW — `unsafe-inline` in CSP script-src
- **Issue**: Next.js bootstrap scripts require inline execution; OpenNext architecture doesn't support nonce plumbing without middleware
- **Mitigation**: XSS injection paths are closed (sanitizer + escape-first markdown); CSP serves as second layer for external script loading
- **Priority**: Phase 3 (requires middleware-based nonce generation)

### 🟢 LOW — Version string mismatch
- **Issue**: `package.json` says `v1.1.0`, mobile menu footer says `v1.2`
- **Priority**: Fix when convenient

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Worker gzip size | ~1.36 MiB |
| TypeScript errors | 0 |
| ESLint errors | 0 |
| API calls/min (worst case) | ~6-10 |
| TanStack Query default staleTime | 60s |
| TanStack Query gcTime | 10min |
| Edge cache (s-maxage) | 10s–3600s |
| SW version | v2.1.0-opennext |
| localStorage keys | ~11 |

---

## Security Checklist

| Check | Status |
|-------|--------|
| XSS prevention (sanitizer) | ✅ Fixed |
| XSS prevention (markdown escape-first) | ✅ |
| SSRF protection (isBlockedHost) | ✅ Fixed |
| SSRF protection (readBodyCapped) | ✅ Fixed |
| Post-redirect SSRF check | ✅ Fixed |
| CSP headers | ✅ Fixed |
| HSTS headers | ✅ Fixed |
| SW cache isolation (proxy routes) | ✅ Fixed |
| SW version bump | ✅ Fixed (v2.1.0) |
| Token hygiene (no tokens in .git/config) | ✅ |
| Rate-limit protection (refetchOnWindowFocus) | ✅ Fixed |
| Secret management (.env gitignored) | ✅ |
| ErrorBoundary | ❌ Missing |
| Automated tests | ❌ Missing |

---

## Data Sources Summary

| Source Type | Count | API Key Required |
|-------------|-------|------------------|
| RSS feeds (Persian) | 15 | No |
| RSS feeds (English) | 17 | No |
| Telegram channels | 3 | No (web preview) |
| X/Twitter accounts | 8 | No (link cards) |
| CoinMarketCap (keyless) | 6 routes | No |
| CoinGecko (free tier) | 3 routes | No (30 req/min) |
| Binance | 1 route | No |
| Open-Meteo | 2 routes | No (10k/day) |
| Nobitex (HTML scraping) | 1 route | No |
| alternative.me | 2 routes | No |

**Total**: 9 external services, all free tier, no API keys.
