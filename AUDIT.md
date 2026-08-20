# AUDIT — Ai24Discovery

Last updated: 2026-08-21

---

## Executive Summary

Ai24Discovery is a bilingual (Persian/English) content discovery + market intelligence platform deployed on Cloudflare Workers (free tier). The project has grown from a simple RSS aggregator to a comprehensive platform with 7 categories, 21 API routes, 10 pages, 62 components, and ~22,000 lines of TypeScript.

### Current Status: ✅ STABLE
- **TypeScript**: 0 errors
- **ESLint**: 0 errors, 0 warnings
- **Build**: Success
- **Worker gzip**: ~1.36 MiB (free tier 3 MiB limit)
- **API calls**: Well within free tier limits (CoinGecko ~6-10 calls/min vs 30/min limit)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                        │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Next.js 16  │  │ 21 API Routes│  │ Static Assets     │  │
│  │ App Router  │  │ (force-dyn)  │  │ (OpenNext bundle) │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────────────┘  │
│         │                  │                                  │
│  ┌──────┴──────────────────┴──────────────────────────────┐ │
│  │              TanStack Query (client-side)              │ │
│  │  • refetchOnWindowFocus: true (global)                  │ │
│  │  • Per-query staleTime (10s–30min)                      │ │
│  │  • Shared cache across pages (same queryKey)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────┴────┐         ┌─────┴─────┐        ┌─────┴─────┐
    │ RSS     │         │ CMC/CG    │        │ Telegram  │
    │ Sources │         │ API       │        │ Preview   │
    │ (31)    │         │ (keyless)│        │ (t.me/s/) │
    └─────────┘         └──────────┘        └───────────┘
```

---

## Resolved Issues (from previous audits)

### ✅ CRITICAL — XSS in dangerouslySetInnerHTML (Task 33)
- **Was**: Coin description, article HTML, and Telegram posts rendered via `dangerouslySetInnerHTML` without sanitization
- **Fixed**: 
  - Coin description: `src/lib/markdown.ts` — safe Markdown→HTML renderer (escape first, then parse)
  - Article HTML: `cleanArticleHtml()` — whitelist tags, reject `javascript:`/`data:` hrefs
  - Telegram posts: existing sanitization in `/api/channel` route

### ✅ HIGH — Article extraction incomplete (Task 39)
- **Was**: `findMatchingCloseTag` had a `lastIndex` bug causing depth counting to drift. Articles from mihanblockchain, gamefa, and digiato returned wrong content or 0 bytes.
- **Fixed**: Tokenizer approach — collect all open/close tag positions into a sorted event array, then walk with depth counting. Also added JSON-LD `articleBody` extraction for JS-rendered sites (Digiato).

### ✅ HIGH — Rate-limiting from excessive polling (Task 38)
- **Was**: 6 `refetchInterval` timers + 15s `setInterval` on ticker → ~30 calls/min (hitting CoinGecko 30/min limit)
- **Fixed**: Removed all `refetchInterval`s, enabled `refetchOnWindowFocus: true` globally. Now ~6-10 calls/min.

### ✅ HIGH — Telegram posts showed oldest first (Task 38)
- **Was**: Telegram web preview returns posts chronologically (oldest first). UI showed oldest post at top.
- **Fixed**: `posts.reverse()` in `/api/channel` route. Also reduced edge cache from 5min to 1min.

### ✅ CRITICAL — Weather city change crashed page (Task 40)
- **Was**: `useLocalStorage` infinite loop — `getSnapshot` returned a new object each call (via `JSON.parse`), causing React's `useSyncExternalStore` to detect a "change" and re-render infinitely → "Maximum update depth exceeded" → page crash.
- **Fixed**: Cache the parsed value in refs. Only re-parse when the raw localStorage string actually changes.

### ✅ MEDIUM — Zoomit RSS feeds broken (Task 41)
- **Was**: Zoomit migrated to Next.js platform and broke category-specific RSS (`/space/feed`, `/ai-articles/feed` return HTML).
- **Fixed**: `pathFilter` field on Source interface — use main feed, filter client-side by URL path.

### ✅ LOW — MiniTrend was misleading (Task 36)
- **Was**: MiniTrend plotted 3 change percentages (7d%, 24h%, 1h%) as a "trend line" — not a real price chart.
- **Fixed**: Removed MiniTrend, replaced with honest "7d %" sortable column.

---

## Remaining Issues

### 🟡 MEDIUM — No CSP/HSTS headers
- **Issue**: No Content-Security-Policy or Strict-Transport-Security headers are set.
- **Impact**: Potential XSS vector if a sanitized tag slips through. No transport security enforcement.
- **Recommendation**: Add CSP headers in `next.config.ts` or via Cloudflare Workers headers. Requires careful tuning to avoid breaking inline styles/scripts.
- **Priority**: Phase 2

### 🟡 MEDIUM — SSRF in /api/article and /api/og-image
- **Issue**: The article proxy fetches arbitrary URLs. While `global_fetch_strictly_public` prevents fetching private IPs, it doesn't validate the URL scheme beyond http/https.
- **Impact**: Low (Cloudflare Workers environment is sandboxed), but could be used for SSRF if the Workers runtime changes behavior.
- **Recommendation**: Add URL allowlist or at minimum validate that the hostname is not a known internal address.
- **Priority**: Phase 2

### 🟢 LOW — Some unused shadcn/ui components
- **Issue**: 30+ shadcn/ui components are installed but not all are used (e.g., accordion, breadcrumb, collapsible, slider).
- **Impact**: Slight bundle size increase.
- **Recommendation**: Remove unused components via `npx shadcn-ui@latest remove <component>`.
- **Priority**: Phase 3

### 🟢 LOW — No automated tests
- **Issue**: No unit tests or integration tests exist.
- **Impact**: Regressions can only be caught by manual QA.
- **Recommendation**: Add Playwright E2E tests for critical paths (homepage load, category navigation, article reader, market table).
- **Priority**: Phase 3

---

## Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Worker gzip size | ~1.36 MiB | Free tier limit: 3 MiB |
| TypeScript errors | 0 | |
| ESLint errors | 0 | |
| ESLint warnings | 0 | |
| API calls/min (worst case) | ~6-10 | CoinGecko limit: 30/min |
| TanStack Query staleTime | 10s–30min | Per-query optimization |
| Edge cache (s-maxage) | 10s–600s | Per-route optimization |
| localStorage keys | 9 | User preferences + caches |
| Service Worker caches | 4 | Static, pages, API, images |

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| XSS prevention | ✅ Fixed | Markdown renderer + HTML sanitizer |
| SSRF protection | ⚠️ Partial | `global_fetch_strictly_public` flag |
| Token hygiene | ✅ Clean | No tokens in .git/config |
| CSP headers | ❌ Missing | Phase 2 |
| HSTS headers | ❌ Missing | Phase 2 |
| Input validation | ✅ Good | URL validation, length limits |
| Rate limiting | ✅ Optimized | refetchOnWindowFocus instead of polling |
| Secret management | ✅ Clean | .env files gitignored |

---

## Data Sources Summary

| Source Type | Count | Primary Use | API Key Required |
|-------------|-------|-------------|------------------|
| RSS feeds (Persian) | 14 | Content discovery | No |
| RSS feeds (English) | 17 | Content discovery | No |
| Telegram channels | 3 | Social portal | No (web preview) |
| X/Twitter accounts | 8 | Social portal | No (link cards) |
| CoinMarketCap | 6 routes | Market data | No (keyless API) |
| CoinGecko | 3 routes | Market data | No (free tier) |
| Binance | 1 route | Real-time prices | No |
| Open-Meteo | 2 routes | Weather + geocode | No (free, 10k/day) |
| Nobitex | 1 route | Tether/Toman price | No (HTML scraping) |
| alternative.me | 2 routes | Fear & Greed index | No |

**Total external API dependencies**: 9 services, all free tier, no API keys required.
