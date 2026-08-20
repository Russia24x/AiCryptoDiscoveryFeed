# 🔍 Comprehensive Audit Report — AiCryptoDiscoveryFeed

**Audit Date:** 2026-08-20
**Auditor:** AI Development Agent
**Scope:** 115 source files, ~19,566 lines of code
**Project:** AiCryptoDiscoveryFeed v1.1.0

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total source files** | 115 |
| **Total lines of code** | ~19,566 |
| **API routes** | 21 |
| **React components** | 31 |
| **Custom hooks** | 19 |
| **TypeScript errors** | 0 |
| **ESLint errors** | 0 |
| **Total issues found** | 54 |
| **Critical** | 1 |
| **High** | 7 |
| **Medium** | 21 |
| **Low** | 25 |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 Cloudflare Workers               │
│              (OpenNext adapter, 1.36 MiB)        │
├─────────────────────────────────────────────────┤
│  Next.js 16 App Router (Turbopack)               │
│  ├── 8 Pages (/, /crypto, /ai, /tech, /gaming,   │
│  │   /entertainment, /crypto/market, /[coin])     │
│  ├── 21 API Routes (feed, market, weather, etc.) │
│  └── 31 React Components                         │
├─────────────────────────────────────────────────┤
│  State Management                                │
│  ├── TanStack Query v5 (28 useQuery calls)       │
│  ├── Zustand (1 store, persisted)                │
│  ├── useSyncExternalStore (6 hooks)              │
│  └── localStorage (8 keys)                       │
├─────────────────────────────────────────────────┤
│  PWA                                             │
│  ├── Service Worker v2 (4 caches, LRU eviction)  │
│  ├── Manifest (installable, shortcuts)           │
│  └── Offline support (per-route caching)          │
├─────────────────────────────────────────────────┤
│  External APIs                                   │
│  ├── CoinMarketCap (keyless, primary)             │
│  ├── CoinGecko (free tier, fallback)              │
│  ├── Binance → Coinbase → CoinGecko (ticker)     │
│  ├── alternative.me (Fear & Greed)               │
│  ├── Open-Meteo (weather)                        │
│  └── Wallex/Nobitex (client-side, Tether/Toman)  │
└─────────────────────────────────────────────────┘
```

---

## 🔴 CRITICAL Issues (1)

### 1. XSS Vulnerability in `dangerouslySetInnerHTML`

**Severity:** 🔴 CRITICAL
**Location:** `coin-detail.tsx:615`, `article-reader.tsx:515`, `telegram-preview.tsx:235`

**Problem:** Three places render upstream HTML without proper sanitization:
- `coin-detail.tsx` renders CoinGecko description HTML with **zero sanitization**
- `article-reader.tsx` and `telegram-preview.tsx` use regex-based sanitization (bypassable)

**Impact:** Malicious content from upstream APIs could execute arbitrary JavaScript.

**Fix:**
```bash
npm i isomorphic-dompurify
```
```tsx
import DOMPurify from "isomorphic-dompurify";
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
```

---

## 🟠 HIGH Issues (7)

### 2. SSRF via `/api/article` and `/api/og-image`
Both accept arbitrary URLs server-side. `global_fetch_strictly_public` blocks private IPs but doesn't prevent open proxy abuse.

**Fix:** Add domain allowlist (check against SOURCES array).

### 3. Missing CSP / Security Headers
No `Content-Security-Policy` header. Critical with `dangerouslySetInnerHTML` usage.

**Fix:** Add CSP, HSTS, COOP to `public/_headers`.

### 4. `useReadLater` Dead Pruning Logic
`stored.length === readStorage().length` is always true because `readStorage()` always prunes.

**Fix:** Compare raw vs pruned length.

### 5. `useFeed` Cache Key Omits `search`
Searching "bitcoin" then "ethereum" overwrites the cache entry.

**Fix:** Add `search.trim()` to `cacheKey`.

### 6. Duplicate `useFeed` Calls in `FeedGrid`
Two API calls per render: one filtered, one unfiltered.

**Fix:** Return per-source counts in feed response.

### 7. Duplicate Ticker Fetches
`EthWidget`, `SolWidget`, `BtcWidget` each fetch `/api/market/binance-ticker` separately.

**Fix:** Share one query key and use `select`.

### 8. Stale MATIC Ticker
Polygon migrated to POL. Binance delisted MATICUSDT.

**Fix:** Update to `POL` symbol.

---

## 🟡 MEDIUM Issues (21)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 9 | Dead ternary in `relativeTime` | `use-feed-state.ts:91` | Remove ternary |
| 10 | No-op `id.replace("/", "/")` | `channel/route.ts:299` | Fix or remove |
| 11 | Module caches not query-keyed | `cmc-listings`, `coingecko-markets`, `cmc-global` | Key by params |
| 12 | `coinCache` unbounded memory leak | `coingecko-coin/route.ts:35` | Add LRU eviction |
| 13 | `useTetherPrice` mutates module state during render | `use-tether-price.ts:191` | Move to `useEffect` |
| 14 | `useTheme` side effects during render | `use-theme.ts:164` | Move to `useEffect` |
| 15 | `useToast` buggy effect dependency | `use-toast.ts:177` | Change `[state]` to `[]` |
| 16 | `PullIndicator` causes remounts | `use-pull-to-refresh.tsx:140` | Extract to top-level |
| 17 | `useFeed` calls `readCache` on every render | `use-feed.ts:94` | Use `useState(() => ...)` |
| 18 | `useLocalStorage` calls `JSON.parse` every snapshot | `use-local-storage.ts:49` | Memoize |
| 19 | `useFeedStats` duplicates feed fetch | `use-feed-stats.ts:23` | Share via React Query |
| 20 | `pubDate` fallback makes undated items appear newest | `feed/route.ts:160` | Use `new Date(0)` |
| 21 | `e.preventDefault()` on passive listener | `use-pull-to-refresh.tsx:109` | Manual `addEventListener` |
| 22 | Division by zero in `MiniTrend`/`FngChart` | `market-intelligence.tsx:909` | Guard `length < 2` |
| 23 | Division by zero in `usePriceAlerts` dup check | `use-price-alerts.ts:122` | Guard `targetPrice === 0` |
| 24 | `currentPrice` updates lost when no alerts trigger | `use-price-alerts.ts:222` | Always write |
| 25 | Self-fetching between API routes | `global-stats`, `top-gainers` | Extract shared lib |
| 26 | `lang` prop + hook mismatch in `ChannelsHub` | `channels-hub.tsx:113` | Pick one approach |
| 27 | IIFE in JSX | `market-intelligence.tsx:795` | Extract component |
| 28 | `motion.tr layout` on 100 rows | `market-intelligence.tsx:592` | Remove `layout` prop |
| 29 | Dynamic `import("sonner")` on every click | `feed-card.tsx:70` | Static import |

---

## 🟢 LOW Issues (25)

| # | Issue | Location |
|---|-------|----------|
| 30 | Unused import `StarOff` | `market-intelligence.tsx:21` |
| 31 | Unused import `useState` | `feed-card.tsx:3` |
| 32 | Unused import `formatNumber` | `hero.tsx:34` |
| 33 | Unused import `Eye` | `hero.tsx:23` |
| 34 | Unused imports `Plus`, `ChevronLeft`, `ChevronRight` | `channels-hub.tsx:9-12` |
| 35 | Dead code `StatPill` function | `market-intelligence.tsx:862` |
| 36 | Dead code `applyEffect` | `use-theme.ts:159` |
| 37 | Dead code `readCity` | `hero.tsx:636` |
| 38 | Two Toaster systems mounted | `layout.tsx:6-7` |
| 39 | `getQueryClient` singleton bypassed | `providers.tsx:25` |
| 40 | `categoryLabel` type lie | `lib/sources/index.ts:494` |
| 41 | No shared types between API and consumers | Multiple |
| 42 | `useLocalStorage` doc/code mismatch | `use-local-storage.ts:31` |
| 43 | API index lists only 5 of 21 routes | `api/route.ts` |
| 44 | No caching strategy documentation | `ARCHITECTURE.md` |
| 45 | `wrangler.jsonc compatibility_date` future-dated | `wrangler.jsonc` |
| 46 | Manifest missing `id` field | `manifest.json` |
| 47 | 5 hooks reinvent `useLocalStorage` | `use-bookmarks`, `use-read-later`, etc. |
| 48 | `withConcurrencyLimit` reinvents Promise pool | `feed/route.ts:229` |
| 49 | Telegram regex extraction is fragile | `channel/route.ts:233` |
| 50 | `setCategory` vs `onCategoryChange` confusion | `use-feed-state.ts:55` |
| 51 | `c: any` in `/api/prices` parsing | `prices/route.ts:68` |
| 52 | `r: any` in geocode response | `weather/geocode/route.ts` |
| 53 | Sonner theme hardcoded | `layout.tsx:113` |
| 54 | `cached` variable name repeated across modules | Multiple |

---

## ✅ Strengths Worth Preserving

1. ✅ **SSR-safe patterns** via `useSyncExternalStore` (avoids React 19 hydration warnings)
2. ✅ **Robust fallback chains** (Binance → Coinbase → CoinGecko → cache)
3. ✅ **Lazy cache cleanup** for Edge runtime (no `setInterval`)
4. ✅ **Bilingual support** with proper RTL and bidi character stripping
5. ✅ **`global_fetch_strictly_public`** flag prevents private IP SSRF
6. ✅ **Service Worker v2** with LRU eviction and per-route strategies
7. ✅ **Tight TypeScript** config (`ignoreBuildErrors: false`)
8. ✅ **Comprehensive edge cache** headers for all API routes
9. ✅ **Clean component decomposition** with reusable UI primitives
10. ✅ **Well-documented** codebase with intent-revealing comments

---

## 📋 Recommended Fix Priority

### Immediate (Critical + High)
1. XSS: Add `DOMPurify` to all `dangerouslySetInnerHTML` sites
2. SSRF: Add domain allowlist to `/api/article` and `/api/og-image`
3. Security headers: Add CSP, HSTS to `public/_headers`
4. Fix `useReadLater` pruning logic
5. Fix `useFeed` cache key to include `search`
6. Deduplicate `useFeed` calls in `FeedGrid`
7. Share ticker query between `BtcWidget`/`EthWidget`/`SolWidget`
8. Update MATIC → POL

### Short Term (Medium)
9. Remove `layout` prop from 100 motion.tr rows
10. Fix `useToast` effect dependency
11. Fix `useTetherPrice` render-time side effects
12. Bound `coinCache` with LRU eviction
13. Extract IIFE to component
14. Static import `sonner`
15. Fix division-by-zero guards

### Long Term (Low)
16. Consolidate localStorage hooks around `useLocalStorage`
17. Extract shared types to `src/types/market.ts`
18. Remove all dead code
19. Add unit tests for sanitization
20. Document caching strategy

---

## 📊 Feature Audit

### Content Discovery
| Feature | Status | Issues | Improvements |
|---------|--------|--------|--------------|
| RSS Feed | ✅ Working | `pubDate` fallback | Add source health monitoring |
| Article Reader | ⚠️ XSS risk | Regex sanitization | Use DOMPurify |
| Telegram Preview | ⚠️ XSS risk | Regex sanitization | Use DOMPurify |
| Source Filter | ✅ Working | Scroll fix applied | Add virtual scroll |
| Bookmarks | ✅ Working | Reinvents pattern | Use `useLocalStorage` |
| Read-Later Queue | ⚠️ Bug | Pruning logic dead | Fix length comparison |
| Search History | ✅ Working | Reinvents pattern | Use `useLocalStorage` |
| Trending Tags | ✅ Working | — | — |

### Market Intelligence
| Feature | Status | Issues | Improvements |
|---------|--------|--------|--------------|
| Top 100 Table | ✅ Working | `layout` prop on 100 rows | Remove `layout` |
| Coin Detail | ⚠️ XSS risk | No HTML sanitization | Use DOMPurify |
| Market Overview | ✅ Working | — | — |
| Trending Sidebar | ✅ Working | — | — |
| Top Gainers | ✅ Working | — | — |
| Hot Coins | ✅ Working | IIFE in JSX | Extract component |
| Fear & Greed | ✅ Working | Division by zero risk | Guard `length < 2` |
| MiniTrend | ✅ Working | Division by zero risk | Guard `length < 2` |
| Watchlist | ✅ Working | Reinvents pattern | Use `useLocalStorage` |
| Price Alerts | ⚠️ Bugs | Dup check, lost updates | Fix both |
| Tether Price | ⚠️ Side effects | Render-time mutation | Move to `useEffect` |

### Infrastructure
| Feature | Status | Issues | Improvements |
|---------|--------|--------|--------------|
| OpenNext | ✅ Working | — | — |
| Cloudflare Workers | ✅ Working | — | — |
| Service Worker v2 | ✅ Working | — | — |
| PWA Install | ✅ Working | — | — |
| Offline Mode | ✅ Working | — | — |
| i18n (FA/EN) | ✅ Working | — | — |
| Theme Toggle | ⚠️ Side effects | Render-time DOM mutation | Move to `useEffect` |
| Pull-to-Refresh | ⚠️ Passive listener | `preventDefault` no-op | Manual listener |

### Performance
| Metric | Status | Notes |
|--------|--------|-------|
| Worker size | ✅ 1.36 MiB | Under 3 MiB free limit |
| API calls/page | ⚠️ Optimizable | 7 on market, 3 on coin detail |
| CoinGecko rate-limit | ✅ Reduced 95% | CMC primary for /api/prices |
| Edge cache TTL | ✅ 5min for CoinGecko | — |
| GPU usage | ✅ No blur/gradient | Phase 22 cleanup |
| Bundle splitting | ⚠️ Can improve | Shared types missing |

---

## 🎯 Next Development Roadmap

### Phase 28: Security Hardening
- [ ] Add `isomorphic-dompurify` to all `dangerouslySetInnerHTML` sites
- [ ] Add domain allowlist to `/api/article` and `/api/og-image`
- [ ] Add CSP, HSTS, COOP headers to `public/_headers`
- [ ] Remove unused shadcn Toaster

### Phase 29: Bug Fixes
- [ ] Fix `useReadLater` pruning logic
- [ ] Fix `useFeed` cache key (add `search`)
- [ ] Fix `useToast` effect deps (`[state]` → `[]`)
- [ ] Fix `useTetherPrice` render-time side effects
- [ ] Fix `useTheme` render-time side effects
- [ ] Fix `usePriceAlerts` division by zero + lost updates
- [ ] Update MATIC → POL ticker
- [ ] Guard `MiniTrend`/`FngChart` against single-point data

### Phase 30: Performance
- [ ] Deduplicate `useFeed` calls in `FeedGrid`
- [ ] Share ticker query between widget components
- [ ] Remove `layout` prop from 100 `motion.tr` rows
- [ ] Static import `sonner` in `feed-card.tsx`
- [ ] Extract `PullIndicator` to top-level component
- [ ] Bound `coinCache` with LRU eviction

### Phase 31: Code Quality
- [ ] Remove all dead code (StatPill, applyEffect, readCity, unused imports)
- [ ] Extract shared types to `src/types/market.ts`
- [ ] Consolidate localStorage hooks around `useLocalStorage`
- [ ] Extract IIFE to `HotCoins` component
- [ ] Fix `lang` prop/hook mismatch in `ChannelsHub`

### Phase 32: Documentation
- [ ] Update README with current 21 API routes
- [ ] Add caching strategy table to ARCHITECTURE.md
- [ ] Add SECURITY.md
- [ ] Update API index endpoint
- [ ] Document `global_fetch_strictly_public` importance
