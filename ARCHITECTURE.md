# Architecture — Ai24Discovery

Last updated: 2026-08-22

This document explains **how the entire system works**: data flow, caching strategy, state management, security, and the role of each technology.

---

## 🧠 Big Picture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                              │
│                                                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐ │
│  │  React 19    │   │  TanStack     │   │  localStorage           │ │
│  │  Components  │──▶│  Query v5     │   │  (useSyncExternalStore)  │ │
│  │  62 files    │   │  (in-memory)  │   │  11 keys (acd:*)        │ │
│  │  10 pages    │   │  refetchOn    │   │  bookmarks, theme,     │ │
│  │              │   │  WindowFocus  │   │  watchlist, alerts...   │ │
│  └──────────────┘   └──────┬───────┘   └────────────────────────┘ │
│                            │                                      │
│  ┌──────────────┐           │           ┌────────────────────────┐ │
│  │  Service     │           │           │  Zustand Store          │ │
│  │  Worker v2.1 │           │           │  (use-ui-store.ts)      │ │
│  │  4 caches   │           │           │  market sort, filters   │ │
│  │  LRU evict  │           │           │                         │ │
│  └──────────────┘           │           └────────────────────────┘ │
└─────────────────────────────┼─────────────────────────────────────┘
                              │ fetch() when stale (not polling)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                CLOUDFLARE WORKERS (EDGE)                           │
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐ │
│  │  Next.js 16  │   │  Edge Cache  │   │  In-Memory Cache        │ │
│  │  21 API      │──▶│  (s-maxage)  │   │  (createFallbackCache)  │ │
│  │  Routes      │   │  10s–3600s   │   │  7 routes, indefinite    │ │
│  │  force-dyn   │   │  SWR         │   │  stale fallback          │ │
│  └──────┬───────┘   └──────────────┘   └────────────────────────┘ │
│         │                                                          │
│         │  fetchWithTimeout (10s) + fetch-guard (SSRF)             │
│  ┌──────┴──────────────────────────────────────────────────────┐ │
│  │  Security: CSP + HSTS + XFO + nosniff + Referrer + Perms    │ │
│  │  Flags: nodejs_compat + global_fetch_strictly_public        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬────────────────────────────────────┘
                               │ Cache miss only
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  EXTERNAL APIs (ALL FREE, NO KEYS)                │
│                                                                   │
│  CoinMarketCap  CoinGecko  Binance   Open-Meteo   Nobitex  alt.me │
│  (keyless)      (30/min)   (no key)  (10K/day)   (scrape) (no key)│
│                                                                   │
│  RSS Sources: 32 (15 Persian + 17 English)                       │
│  Telegram: 3 channels (web preview scraping)                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Layer 1: External APIs (Upstream)

### Market Data (12 routes under `/api/market/`)

| Service | Routes | Rate Limit | API Key |
|---------|--------|------------|---------|
| CoinMarketCap (keyless) | cmc-listings, cmc-global, cmc-coin, cmc-categories | Unknown (generous) | None |
| CoinGecko (free) | coingecko-markets, coingecko-coin | 30 req/min | None |
| Binance | binance-ticker | Unlimited | None |
| alternative.me | fear-greed, fear-greed-historical | ~5 req/min | None |

### Content (4 routes)

| Service | Route | Rate Limit | API Key |
|---------|-------|------------|---------|
| RSS feeds (32 sources) | /api/feed | Per-source (varies) | None |
| Article proxy | /api/article | N/A (fetches user URL) | None |
| Telegram preview | /api/channel | N/A (scrapes t.me/s/) | None |
| OG image proxy | /api/og-image | N/A (fetches user URL) | None |

### Other (4 routes)

| Service | Route | Rate Limit | API Key |
|---------|-------|------------|---------|
| CMC prices | /api/prices | Reuses cmc-listings cache | None |
| Nobitex Tether | /api/tether | Unknown | None (HTML scraping) |
| Open-Meteo | /api/weather, /api/weather/geocode | 10K/day | None |

### Multi-source fallback chains

**Price data** (`useCryptoPrice` hook):
1. `/api/market/binance-ticker` (real-time, Binance → Coinbase → CoinGecko)
2. `/api/prices` (CMC, shared with ticker bar)
3. `/api/market/cmc-listings` (CMC, shared with market table)

**Article extraction** (`/api/article`):
1. JSON-LD `articleBody` (for JS-rendered sites)
2. Content-class div (nesting-aware tokenizer)
3. `<article>` tag (nesting-aware)
4. `<main>` tag (nesting-aware)
5. Paragraph fallback (≥5 paragraphs)

---

## 📦 Layer 2: Cloudflare Workers (Edge)

### Architecture: OpenNext + Cloudflare

- Next.js 16 app is built by `opennextjs-cloudflare` into a single Worker bundle (`.open-next/worker.js`)
- Static assets served from `.open-next/assets/` via Workers Static Assets binding
- All pages are `"use client"` (100% client-rendered)
- All API routes are `force-dynamic` (always run on the Worker, never statically rendered)
- No Incremental Cache (Next.js ISR) — `open-next.config.ts` uses empty `defineCloudflareConfig({})`

### Edge Cache (Cloudflare CDN)

Each API route sets its own `Cache-Control: public, s-maxage=N, stale-while-revalidate=M`:

| Route | s-maxage | SWR |
|-------|----------|-----|
| /api/feed | 600s (10min) | 1200s |
| /api/article | 600s | 1200s |
| /api/channel | 60s | 120s |
| /api/prices | 60s | 300s |
| /api/tether | 300s | 600s |
| /api/market/binance-ticker | 10s | 30s |
| /api/market/cmc-listings | 60s | 300s |
| /api/market/cmc-global | 60s | 300s |
| /api/market/fear-greed | 900s | 1800s |
| /api/market/fear-greed-historical | 900s | 1800s |
| /api/market/trending | 300s | 900s |
| /api/market/top-gainers | 60s | 300s |
| /api/market/global-stats | 60s | 300s |
| /api/market/coingecko-markets | 300s | 600s |
| /api/market/coingecko-coin | 300s | 600s |
| /api/market/cmc-coin | 300s | 900s |
| /api/market/cmc-categories | 300s | 900s |
| /api/weather | 600s | 1200s |
| /api/weather/geocode | 3600s | 86400s |
| /api/og-image | 3600s | 86400s |

### In-Memory Cache (Worker isolate)

7 routes use `createFallbackCache<T>()` from `src/lib/fallback-cache.ts`:

| Route | Cache Type | TTL | Fallback Policy |
|-------|-----------|-----|-----------------|
| /api/prices | `createFallbackCache` | 5min (proactive refresh) | Serve indefinitely |
| /api/tether | `createFallbackCache` | 5min (proactive refresh) | Serve indefinitely |
| /api/market/binance-ticker | `createFallbackCache` | N/A | Serve indefinitely |
| /api/market/cmc-listings | `createFallbackCache` | N/A | Serve indefinitely |
| /api/market/cmc-global | `createFallbackCache` | N/A | Serve indefinitely |
| /api/market/coingecko-markets | `createFallbackCache` | N/A | Serve indefinitely |
| /api/market/fear-greed | `createFallbackCache` | N/A | Serve indefinitely |
| /api/feed | `Map<string, {items, timestamp}>` | 5min | N/A (returns empty) |

**Policy**: Once cached, data is served as fallback indefinitely — however old, as long as the isolate stays warm. The `cached: true` flag in the response tells the client the data is stale. This matches the pre-refactor behavior exactly.

**Note**: Module-scope variables persist within a single Cloudflare Workers isolate. Different isolates (different regions or after idle eviction) have empty caches. The edge cache (s-maxage) handles cross-isolate caching.

### Feed route cache optimization

The feed route caches by **feed URL** (not source ID), so multiple sources sharing the same feed URL (e.g., `zoomit-main` and `zoomit-space` both use `https://www.zoomit.ir/feed/`) reuse the same cache entry — avoiding fetching the 500KB XML twice.

---

## 📦 Layer 3: Client (Browser)

### TanStack Query v5

**Global defaults** (`src/lib/query-client.ts`):
- `staleTime`: 60s (1 min)
- `gcTime`: 10min
- `retry`: 1 (with exponential backoff: 1s, 2s, 4s... capped at 30s)
- `refetchOnWindowFocus`: true ← **key strategy** (replaces polling)
- `refetchOnReconnect`: true
- `refetchOnMount`: true

**Strategy**: No `refetchInterval` anywhere. Data refreshes when:
1. User switches back to the tab (focus refetch — only if stale)
2. User manually clicks Refresh
3. First mount

This reduces API calls by ~75% compared to polling (was ~30/min, now ~6-10/min).

**Per-query staleTime overrides**:

| Query | staleTime | Notes |
|-------|-----------|-------|
| binance-ticker | 30s | Real-time-ish |
| prices (CMC) | 2min | Shared with ticker |
| cmc-listings | 5min | Shared with market table |
| coingecko-markets | 2min | |
| global-stats | 2min | |
| trending | 10min | Slow-changing |
| fear-greed | 10min | Hourly upstream |
| fear-greed-historical | 30min | Historical data |
| top-gainers | 5min | |
| weather | 10min | |
| channel (Telegram) | 2min | Posts appear frequently |
| coin detail | 5min | |
| feed | 1min | |

**Shared cache**: Same `queryKey` across components reuses data. Example: `["channel", handle]` is shared between ChannelsHub sidebar widget and SocialPortal full-page view — zero duplicate API calls.

### localStorage (useSyncExternalStore)

Hook: `src/hooks/use-local-storage.ts`

**Architecture**: Uses `useSyncExternalStore` (NOT `useState + useEffect` — that triggers React 19's `set-state-in-effect` warning).

**Snapshot caching**: `cachedRawRef` and `cachedValueRef` (useRefs). `getSnapshot` checks if the raw localStorage string is unchanged; if so, returns the cached parsed value (stable reference — prevents infinite re-render loop that previously crashed the page).

**Event system**: Listens to BOTH `'storage'` (cross-tab) AND custom `'${key}-changed'` (same-tab) events. Keys are prefixed with `acd:` (e.g., `acd:weather-city`), so the custom event name is `acd:weather-city-changed`.

**11 localStorage keys**:

| Key | Purpose | TTL |
|-----|---------|-----|
| `acd:bookmarks` | Article bookmarks | Permanent |
| `acd:read-later` | Read-later queue | 7 days |
| `acd:watchlist` | Crypto watchlist | Permanent |
| `acd:price-alerts` | Price alerts | Permanent |
| `acd:search-history` | Search history | 30 days |
| `acd:theme` | Theme (dark/light/system) | Permanent |
| `acd:lang` | Language (fa/en) | Permanent |
| `acd:weather-city` | Weather city | Permanent |
| `acd:custom-channels` | Custom Telegram channels | Permanent |
| `acd:reader-font-size` | Article reader font size | Permanent |
| `acd:feed-cache:*` | Feed cache (per category) | 5min |

### Zustand Store

Hook: `src/hooks/use-ui-store.ts`

Stores UI state that needs to survive page navigation:
- `marketSortField` / `marketSortDir` — market table sort
- `marketActiveTag` — active category filter tag
- `marketShowWatchlistOnly` — watchlist filter toggle
- `marketViewMode` — grid/list view

Persisted to localStorage via `persist` middleware.

### Service Worker (`public/sw.js`)

**Version**: `v2.1.0-opennext`

**4 caches** (all versioned):
- `acd-static-v2.1.0-opennext` — static assets (no LRU, immutable)
- `acd-pages-v2.1.0-opennext` — HTML pages (max 20, LRU)
- `acd-api-v2.1.0-opennext` — API responses (max 50, LRU, <1MB each)
- `acd-images-v2.1.0-opennext` — images (max 100, LRU)

**Cache strategies**:
- API: network-first, cache fallback (except `/api/article` and `/api/og-image` — never cached)
- Navigation: network-first with per-route caching
- Static: stale-while-revalidate
- Images: cache-first with background revalidation

**Proxy route exclusion**: `/api/article` and `/api/og-image` are excluded from cache writes. On network failure they return 503 (never serve stale cache). This prevents XSS payload persistence across sessions.

**Offline page**: Bilingual FA/EN HTML.

**Periodic sync**: Refreshes `/api/feed?limit=10`, `/api/prices`, `/api/market/fear-greed`.

---

## 🔒 Security Architecture

### Security Headers (via `next.config.ts` `headers()`)

Applied to ALL responses (pages + API routes):

| Header | Value |
|--------|-------|
| X-Frame-Options | SAMEORIGIN |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Strict-Transport-Security | max-age=63072000; includeSubDomains |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline'; ... |

**Note**: `public/_headers` file only applies to static-assets layer responses. Since 100% of pages are `"use client"` and 100% of API routes are `force-dynamic`, all responses go through the Worker — so `_headers` rules never fire. The `headers()` function in `next.config.ts` is the correct way.

**CSP details**:
- `script-src 'self' 'unsafe-inline'` — Next.js bootstrap requires inline (OpenNext doesn't support nonce plumbing without middleware)
- `connect-src 'self'` — prevents data exfiltration to external domains
- `img-src 'self' data: https: http:` — images from many CDNs (some HTTP)
- `object-src 'none'` — blocks Flash/plugins
- `frame-ancestors 'self'` — anti-clickjacking

### SSRF Protection (`src/lib/fetch-guard.ts`)

Used by proxy routes (`/api/article`, `/api/og-image`):

1. **`isBlockedHost(hostname)`** — blocks:
   - Internal hostnames: `localhost`, `.local`, `.internal`, `.localdomain`, `.home.arpa`
   - IPv4 private ranges: `0.x`, `10.x`, `127.x`, `169.254.x` (link-local/cloud metadata), `100.64/10` (CGNAT), `172.16/12`, `192.168/16`
   - IPv6: `::1`, `::`, `fc00::/7`, `fe80::/10`

2. **Post-redirect check** — after `fetchWithTimeout(redirect: "follow")`, checks `res.url` hostname again (catches DNS rebinding / open redirects to internal hosts)

3. **`readBodyCapped(res, maxBytes)`** — streams response body with byte counting:
   - Article: 2MB cap
   - OG image: 1MB cap
   - Prevents memory exhaustion DoS

4. **Runtime flag** — `global_fetch_strictly_public` in `wrangler.jsonc` blocks actual network connections to private IPs at the Cloudflare Workers runtime level (catches DNS rebinding that hostname string comparison can't)

### XSS Prevention

1. **`cleanArticleHtml(html)`** in `/api/article/route.ts`:
   - Tag whitelist: `p, h1-h6, ul, ol, li, a, img, figure, figcaption, blockquote, pre, code, br, hr, em, strong, b, i, u, s, table, thead, tbody, tr, th, td`
   - Strips: scripts, styles, noscript, svg, iframe, form, nav, footer, header, aside, button, HTML comments
   - Strips attributes: `class`, `style`, `id`, `onclick`, `onload`, `onerror`, `data-*`
   - `<a href>`: only http(s), `/`, `#`, `mailto:` allowed; `javascript:`, `data:`, `vbscript:` → dropped
   - `<img src>`: only http(s) or protocol-relative (`//`); `data:` URIs rejected
   - **All fallback paths** (og:image, og:description) now route through `cleanArticleHtml()` — not raw template literals

2. **`markdownToHtml(md)`** in `src/lib/markdown.ts`:
   - Escape-first: HTML entities (`& < > " '`) are escaped BEFORE Markdown parsing
   - Links: only `http(s)` scheme allowed; other schemes become plain text
   - Hard cap: 4000 chars input, 3 paragraphs

3. **Telegram post sanitization** in `/api/channel/route.ts`:
   - Custom `sanitizePostHtml()` strips dangerous tags and attributes
   - HTML entities decoded (including RTL marks: `&rlm;`, `&lrm;`, `&zwnj;`)

### SW Cache Isolation

`/api/article` and `/api/og-image` are excluded from Service Worker cache:
- **Write**: `noCache` flag prevents `cache.put()` for these paths
- **Read**: On network failure, returns 503 immediately (before `cache.match()`)
- **Version bump**: `v2.0.0` → `v2.1.0` flushes all old caches (including any cached proxy responses from before the fix)

---

## 📰 Content Pipeline

### RSS Feed Aggregation (`/api/feed`)

1. Sources filtered by `category`, `language`, optional `source` ID
2. Up to 8 sources fetched in parallel (`Promise.allSettled`)
3. Each source: `fetchWithTimeout` (10s) → `parseFeed` (regex-based, 60 items max) → cache by feed URL (5min TTL)
4. `pathFilter`: if source has `pathFilter`, items filtered by `link.includes(pathFilter)` (e.g., Zoomit `/space/`)
5. Dedupe: by normalized title + hostname + pathname
6. Sort: by pubDate descending
7. Response: `Cache-Control: public, s-maxage=600, stale-while-revalidate=1200`

### Article Extraction (`/api/article`)

1. URL validated (http/https only)
2. SSRF guard: `isBlockedHost(hostname)` → 400 if blocked
3. `fetchWithTimeout` (10s, redirect: "follow")
4. Post-redirect SSRF guard
5. `readBodyCapped` (2MB)
6. `extractArticleHtml(html)` — 5 strategies (see above)
7. `extractImages()` — checks `src`, then `data-src`, `data-lazy-src`, `data-lazy-original`, `data-original` (lazy-load fallback)
8. `cleanArticleHtml()` — whitelist sanitizer on body + fallback paths
9. `extractMeta()` — og:title, og:image, og:description, author, published_date, favicon

### Image Extraction

`extractImages(html)` in `/api/article/route.ts`:
- Matches full `<img ...>` tags (not just `src` attribute)
- Tries `src` first
- If `src` is `data:` URI or empty, checks: `data-src`, `data-lazy-src`, `data-lazy-original`, `data-original`
- Filters: rejects `data:` URIs, dedupes
- Max 20 images

### pathFilter

For sources whose category-specific RSS endpoints are broken (Zoomit migrated to Next.js, breaking `/space/feed` and `/ai-articles/feed` which now return HTML):
- Use the main feed URL (`https://www.zoomit.ir/feed/`)
- Filter items client-side: `items.filter(it => it.link.includes(src.pathFilter!))`
- 2 sources use pathFilter: `zoomit-main` (`/ai-articles/`), `zoomit-space` (`/space/`)
- Cache shared between them (key by feed URL, not source ID)

---

## 🎨 Brand & UI Architecture

### Logo (`src/components/brand/logo.tsx`)

- Brand: **Ai24Discovery** (3 spans, LTR-isolated via `dir="ltr"`)
  - Ai → `#00ffff` (cyan)
  - 24 → `#ffffff` (white)
  - Discovery → `#2dd4bf` (bright teal)
- Category name below: always English (not translated)
  - Special: AI shows "AI Lab" not "AI"
  - Social shows "Social" (not in CATEGORY_META — uses `SOCIAL_TINT`)

### Category System

7 categories with distinct brand colors:

| Category | Tint | Icon | Route |
|----------|------|------|-------|
| Crypto | `#f7931a` | Bitcoin | /crypto |
| AI | `#2dd4bf` | Brain | /ai |
| Tech | `#38bdf8` | Cpu | /tech |
| Gaming | `#a78bfa` | Gamepad2 | /gaming |
| Entertainment | `#f472b6` | Film | /entertainment |
| Space | `#e8e6e1` | Rocket | /space |
| Social | `#ef4444` | Send | /social (route only, not a feed Category) |

### Fonts (self-hosted via @fontsource)

| Font | Weights | Usage |
|------|---------|-------|
| Estedad | 800, 900 | Display headings |
| Vazirmatn | 300-900 | Persian body text |
| Inter | 300-900 | Latin/numbers |
| JetBrains Mono | 400, 500, 700 | Code blocks |

CSS variables defined in `globals.css` `:root`:
```css
--font-vazirmatn: "Vazirmatn", system-ui, sans-serif;
--font-inter: "Inter", system-ui, sans-serif;
--font-jetbrains-mono: "JetBrains Mono", monospace;
```

No `next/font/google` — all fonts imported as per-weight CSS from `@fontsource` packages in `layout.tsx`.

---

## 📊 Shared Utilities (`src/lib/`)

| File | Purpose | Used By |
|------|---------|---------|
| `utils.ts` | `cn()` (clsx + tailwind-merge) | All components |
| `query-client.ts` | TanStack Query singleton + defaults | providers.tsx |
| `fetch-with-timeout.ts` | `fetchWithTimeout(url, {headers, timeoutMs, next, redirect})` | All 20 API routes with external fetch |
| `fallback-cache.ts` | `createFallbackCache<T>()` factory (get/set/clear, indefinite fallback) | 7 API routes |
| `fetch-guard.ts` | `isBlockedHost(hostname)` + `readBodyCapped(res, maxBytes)` | /api/article, /api/og-image |
| `markdown.ts` | `markdownToHtml(md)` + `truncateMarkdown(md, n)` (escape-first) | coin-detail.tsx |
