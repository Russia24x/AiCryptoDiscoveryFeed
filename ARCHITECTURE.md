# Architecture Documentation — Ai Crypto Discovery

This document explains **how the entire system works**: API data flow, caching
strategy, state management, and the role of each technology.

---

## 🧠 Big Picture ( Mental Model )

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │  React UI    │   │  TanStack     │   │  localStorage         │ │
│  │  Components  │──▶│  Query Cache  │   │  (user preferences)   │ │
│  │  (pages)     │   │  (in-memory)  │   │  bookmarks, theme,    │ │
│  │              │   │               │   │  watchlist, alerts... │ │
│  └──────────────┘   └──────┬───────┘   └──────────────────────┘ │
│                            │                                      │
│                     fetch() when stale                             │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE PAGES (EDGE)                        │
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │  Next.js API │   │  Edge Cache  │   │  In-Memory Cache      │ │
│  │  Routes      │──▶│  (s-maxage)  │   │  (let cached = ...)   │ │
│  │  (/api/*)    │   │              │   │  fallback when        │ │
│  │              │   │  Hits = 0    │   │  upstream fails       │ │
│  │              │   │  upstream    │   │                       │ │
│  └──────┬───────┘   │  calls       │   └──────────────────────┘ │
│         │           └──────────────┘                            │
│         │  Cache miss only                                         │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL APIs (ALL FREE)                        │
│                                                                   │
│  CoinMarketCap  CoinGecko  Binance  DefiLlama  Yahoo  Open-Meteo │
│  (keyless)      (30/min)   (no key) (no limit)          (10K/day)│
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Layer 1: External APIs (Upstream)

All data comes from **free, no-API-key** services:

| API | What it gives us | Free tier | Rate limit |
|---|---|---|---|
| **CoinMarketCap** (keyless) | Top 100 coins, global metrics, coin metadata, tags | Unlimited | Throttled by IP |
| **CoinGecko** | Markets table, coin detail, trending | 30 calls/min | 429 if exceeded |
| **Binance** | Real-time BTC/ETH/SOL prices | Unlimited | Geo-blocked US |
| **DefiLlama** | TVL, fees, revenue, methodology | Unlimited | No limit |
| **alternative.me** | Fear & Greed Index | Unlimited | No limit |
| **Yahoo Finance** | S&P 500 index | Unlimited | No key needed |
| **Wallex/Nobitex** | Iranian Tether/Toman price | Unlimited | Geo-blocked US |
| **Open-Meteo** | Weather + geocoding | 10K calls/day | No key |

**Key insight**: We never call these APIs directly from the browser.
All calls go through our own `/api/*` routes on Cloudflare Workers.

---

## 📦 Layer 2: Our API Routes (Cloudflare Edge)

We have **27 API routes** in `src/app/api/`. Each one:

1. **Receives** a request from the browser
2. **Checks** the edge cache (Cloudflare CDN)
3. **If cache hit**: returns cached response (0 upstream calls)
4. **If cache miss**: calls the external API, caches the response, returns it
5. **If upstream fails**: serves in-memory cached data as fallback

### How Edge Caching Works

Every API route sets this HTTP header:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

This tells Cloudflare's CDN:
- `s-maxage=60`: Cache this response for 60 seconds at the edge
- `stale-while-revalidate=300`: After 60s, serve the stale cached response
  while fetching a fresh one in the background (up to 300s)

**What this means in practice:**

```
User A visits /crypto/market at 12:00:00
  → Edge cache miss → calls CoinGecko → caches response → returns data

User B visits /crypto/market at 12:00:30
  → Edge cache HIT (still fresh) → returns cached data (0 upstream calls)

User C visits /crypto/market at 12:01:01
  → Edge cache expired (60s passed) → calls CoinGecko → caches → returns

User D visits /crypto/market at 12:01:30
  → Edge cache HIT → returns cached data (0 upstream calls)
```

**Result**: For 100 users visiting in 1 minute, we make only 1 CoinGecko call.

### Cache TTL by Data Type

| Data type | s-maxage | Why |
|---|---|---|
| BTC price (Binance) | 10s | Price changes every second |
| Tether/Toman price | 30s | Iranian market updates frequently |
| S&P 500 | 60s | Market data, updates every minute |
| CoinGecko markets | 60s | Top 100 coins, changes every minute |
| CMC listings | 60s | Same as above |
| CMC global metrics | 60s | Global stats, changes slowly |
| CoinGecko coin detail | 120s | Coin details change less frequently |
| DefiLlama protocol/fees | 300s | DeFi TVL changes slowly (5 min) |
| Fear & Greed | 900s | Updates hourly |
| Fear & Greed historical | 900s | Historical data doesn't change |
| Weather | 600s | Weather updates every 10 min |
| Geocoding | 3600s | Cities don't move |
| og:image | 3600s | Images rarely change |

### Fallback Chains

Some routes have multiple upstream sources:

```
/api/market/binance-ticker:
  1. Try Binance (fastest, real-time)
  2. If Binance fails → Try Coinbase (global, no geo-block)
  3. If Coinbase fails → Try CoinGecko (slower, but reliable)
  4. If all fail → Serve in-memory cached data
  5. If no cache → Return error

/api/market/iran-tether:
  1. Try Wallex (real Iranian market rate)
  2. If Wallex fails → Try Nobitex
  3. If both fail → Return { unavailable: true }
     (UI shows "ناموجود" — we DON'T fall back to official USD rate)
```

### CoinGecko Retry with Exponential Backoff

CoinGecko has a strict 30 calls/min limit. When we hit it (HTTP 429):

```
Attempt 1: Call CoinGecko → 429 (rate limited)
  → Wait 1 second (exponential backoff: 2^0 = 1s)
Attempt 2: Call CoinGecko → 200 (success) OR 429 again
  → If still 429: serve in-memory cached data (with cached: true flag)
  → If no cache: return { rateLimited: true } (UI shows error)
```

---

## 📦 Layer 3: TanStack Query (Browser Cache)

TanStack Query is our **client-side data layer**. It sits between React
components and our API routes.

### How It Works

```
React Component                    TanStack Query Cache
     │                                    │
     │  useQuery({                        │
     │    queryKey: ["market", "BTC"],    │
     │    queryFn: fetch("/api/..."),     │  1. Check cache (in-memory)
     │    staleTime: 30_000,               │  2. If fresh → return immediately (0 fetch)
     │  })                                 │  3. If stale → return stale data + refetch
     │                                    │  4. If no data → fetch + show loading
     ▼                                    │
  { data, isLoading, error }              │
                                          │
                          fetch() only when stale or first load
                                          ▼
                                   /api/market/... (our edge route)
```

### Key Concepts

**queryKey**: A unique identifier for each piece of data.
```ts
queryKey: ["market", "binance-ticker", "BTC"]  // BTC price from Binance
queryKey: ["market", "coingecko-coin", "bitcoin"]  // Bitcoin full detail
queryKey: ["weather", 35.6892, 51.3890]  // Tehran weather
```
If two components use the same queryKey, TanStack Query **deduplicates** them
into a single fetch. Example: `BtcWidget` and `EthWidget` both fetch from
`/api/market/binance-ticker` — only 1 request is made.

**staleTime**: How long data is considered "fresh" (no refetch needed).
```ts
staleTime: 30_000  // 30 seconds — data is fresh for 30s
```
After staleTime expires, the data is still shown (not cleared), but the next
mount or focus event triggers a background refetch.

**refetchInterval**: Polling interval (for live data).
```ts
refetchInterval: 10_000  // Refetch every 10 seconds
```
The refetch only happens if the component is mounted and the tab is visible.

**gcTime (garbage collection)**: How long to keep data after all observers
unmount. Default: 5 minutes. This means navigating away and back is instant.

### Query Flow Example

```
1. User opens /crypto/market
2. MarketIntelligence component mounts
3. useQuery({ queryKey: ["market", "coingecko-markets", "top100"] })
4. TanStack Query: "Is this in cache?" → No
5. TanStack Query: "Is anyone else fetching this?" → No
6. Call queryFn → fetch("/api/market/coingecko-markets?per_page=100")
7. Our API route: checks edge cache → hit → returns data
8. TanStack Query: stores in cache, returns to component
9. Component renders table with 100 coins

10. User navigates to /crypto/market/bitcoin
11. CoinDetail component mounts
12. useQuery({ queryKey: ["market", "coingecko-coin", "bitcoin"] })
13. TanStack Query: "Is this in cache?" → No
14. Fetch → API route → CoinGecko → returns data
15. Component renders coin detail

16. User navigates back to /crypto/market
17. MarketIntelligence mounts again
18. useQuery({ queryKey: ["market", "coingecko-markets", "top100"] })
19. TanStack Query: "Is this in cache?" → YES (still in gcTime)
20. Returns cached data INSTANTLY (0 fetch)
21. Background: checks if stale → yes (30s passed) → refetches silently
22. When fresh data arrives, updates the table
```

### All TanStack Query Calls (27 total)

| Component | queryKey | staleTime | refetchInterval |
|---|---|---|---|
| **hero.tsx** (Home) | | | |
| BtcWidget | `["market", "binance-ticker", "BTC"]` | 5s | 10s |
| TetherWidget | `["market", "iran-tether"]` | 15s | 30s |
| Sp500Widget | `["market", "sp500"]` | 30s | 60s |
| FearGreedWidget | `["market", "fear-greed"]` | 2min | 5min |
| WeatherWidget | `["weather", lat, lon]` | 5min | 10min |
| **crypto-widgets.tsx** (/crypto) | | | |
| EthWidget | `["market", "binance-ticker", "ETH"]` | 10s | 15s |
| SolWidget | `["market", "binance-ticker", "SOL"]` | 10s | 15s |
| TopGainersWidget | `["market", "top-gainers"]` | 2min | 5min |
| DominanceWidget | `["market", "cmc-global"]` | 2min | 5min |
| **market-intelligence.tsx** | | | |
| Coin table | `["market", "coingecko-markets", "top100"]` | 1min | 5min |
| CMC tags | `["market", "cmc-listings", "top100"]` | 2min | — |
| Global stats | `["market", "global-stats"]` | 1min | — |
| Trending | `["market", "trending"]` | 5min | — |
| Altcoin season | `["market", "altcoin-season"]` | 5min | — |
| F&G historical | `["market", "fear-greed-historical", 30]` | 15min | — |
| **coin-detail.tsx** | | | |
| CoinGecko detail | `["market", "coingecko-coin", coinId]` | 2min | — |
| CMC listings (shared) | `["market", "cmc-listings", "top100"]` | 2min | — |
| CMC coin metadata | `["market", "cmc-coin", slug]` | 5min | — |
| DefiLlama TVL | `["market", "defillama-protocol", coinId]` | 5min | — |
| DefiLlama fees | `["market", "defillama-summary", coinId]` | 5min | — |
| TVL history | `["market", "defillama-tvl-history", chain]` | 10min | — |
| **use-feed.ts** | | | |
| RSS feed | `["feed", category, lang, source, search]` | 1min | — |

### Shared Cache Benefits

The `["market", "cmc-listings", "top100"]` query is used by:
1. `MarketIntelligence` (for category filter tags)
2. `CoinDetail` (to find CMC slug by matching CoinGecko symbol)

Both components share the **same cached data** — only 1 fetch is made.

Similarly, `["market", "binance-ticker", "BTC"]` is used by:
1. `BtcWidget` on the home page
2. The Ticker bar at the top

Both share the same cache entry.

---

## 📦 Layer 4: localStorage (User State)

User preferences that need to **survive page reload** are stored in
localStorage. Each preference has its own hook:

```
┌─────────────────────────────────────────────────┐
│                 BROWSER localStorage               │
│                                                    │
│  acd:lang          → "fa" or "en"                  │
│  acd:theme         → "dark" or "light" or "system"│
│  acd:bookmarks     → [article1, article2, ...]    │
│  acd:read-later    → [article1, ...] (7-day TTL)   │
│  acd:search-history → ["bitcoin", "ethereum", ...]│
│  acd:watchlist     → ["bitcoin", "ethereum", ...] │
│  acd:price-alerts  → [{coinId, target, ...}, ...] │
│  acd:weather-city   → {lat, lon, name, ...}        │
│  acd:custom-channels → [{handle, type, ...}, ...]  │
│  acd:feed-cache:*  → {data, timestamp} (5-min TTL) │
│  acd:reader-font-size → 16                         │
└─────────────────────────────────────────────────┘
```

### Hook Pattern

Every localStorage hook follows the same pattern:

```tsx
const STORAGE_KEY = "acd:bookmarks";

// 1. Read from localStorage
function readStorage(): BookmarkEntry[] { ... }

// 2. Write to localStorage + notify
function writeStorage(entries: BookmarkEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("acd:bookmarks-changed"));
}

// 3. React hook
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(readStorage());

  useEffect(() => {
    // Listen for changes (same tab + cross-tab)
    const onChange = () => setBookmarks(readStorage());
    window.addEventListener("storage", onChange);           // cross-tab
    window.addEventListener("acd:bookmarks-changed", onChange); // same-tab
    return () => { /* cleanup */ };
  }, []);

  const toggleBookmark = useCallback((entry) => {
    writeStorage(/* updated list */);
    setBookmarks(/* updated list */);
  }, []);

  return { bookmarks, toggleBookmark, ... };
}
```

### Why not Zustand?

**Zustand** is a global state store (like Redux but simpler). It's in
`package.json` but **intentionally not used** because:

1. **TanStack Query handles all server state** (API data)
2. **localStorage hooks handle all client state** (user preferences)
3. **Each hook is self-contained** — no shared global store needed
4. **Zustand would add an abstraction layer** without benefit

**When Zustand WOULD make sense:**
- If we need a global store that multiple components read/write simultaneously
  (e.g., a shopping cart, a multi-step wizard state)
- If we need middleware (persistence, devtools, logging)
- If we have derived state that depends on multiple sources

**Current assessment**: The project doesn't need any of these. Each
localStorage hook is independent and self-contained. Adding Zustand would
mean rewriting 7 hooks into a single store, which adds complexity without
benefit.

**Decision**: Keep Zustand in `package.json` (it's 1.2KB gzipped) for future
use, but don't force it into the current architecture.

---

## 📦 Layer 5: Components That Still Use Manual fetch()

These components use `fetch()` directly instead of TanStack Query:

| Component | What it fetches | Should migrate? | Priority |
|---|---|---|---|
| `ticker.tsx` | `/api/prices` (10-coin ticker) | ✅ Yes — should share cache with BtcWidget | Medium |
| `channels-hub.tsx` | `/api/channel` (Telegram posts) | ✅ Yes — multiple channels fetched independently | Low |
| `telegram-preview.tsx` | `/api/channel` (single channel) | ✅ Yes — should share with channels-hub | Low |
| `article-reader.tsx` | `/api/article` (article HTML) | ✅ Yes — user might re-open same article | Low |
| `feed-grid.tsx` | Uses `useFeed` hook (already has TanStack Query) | ✅ Already migrated | — |
| `settings-panel.tsx` | `/api/weather/geocode` (city search) | ⚠️ Debounced search — TanStack Query possible but not critical | Low |
| `smart-image.tsx` | `/api/og-image` (image proxy) | ❌ No — one-off image fetch, no caching needed | — |

**Note**: `feed-grid.tsx` uses `useFeed()` hook which IS TanStack Query
backed (since Phase 15). It's listed here because the grep found `fetch()`
in the file (used by the `useFeed` hook itself).

### Migration Priority

1. **`ticker.tsx`** → use `useQuery` with `["market", "prices"]` queryKey
   - Currently polls every 15s with `setInterval`
   - Should use `refetchInterval: 15_000` like other widgets
   - Would share cache with `BtcWidget` if same queryKey

2. **`channels-hub.tsx`** → use `useQuery` with `["channel", handle]` queryKey
   - Currently uses `useEffect + fetch` for each channel
   - Would benefit from cache when navigating between channels

3. **`telegram-preview.tsx`** → share queryKey with `channels-hub.tsx`

4. **`article-reader.tsx`** → use `useQuery` with `["article", url]` queryKey
   - Would cache article content so re-opening is instant

---

## 📊 Data Flow Summary

### Market Data Flow (BTC price example)

```
Binance API (upstream)
    ↓ fetch (only on cache miss)
/api/market/binance-ticker (our edge route)
    ↓ HTTP response with Cache-Control: s-maxage=10
Cloudflare Edge CDN (caches for 10s)
    ↓ HTTP response (cached or fresh)
TanStack Query Cache (browser, staleTime: 5s, refetchInterval: 10s)
    ↓ useQuery returns { data, isLoading }
BtcWidget component (renders price)
    ↓ React renders
User sees BTC price
```

### Content Data Flow (RSS feed example)

```
RSS feeds (27 sources, upstream)
    ↓ fetch (only on cache miss, 5 sources in parallel)
/api/feed (our edge route, s-maxage=600)
    ↓ HTTP response
Cloudflare Edge CDN (caches for 10 min)
    ↓
TanStack Query Cache (browser, staleTime: 60s)
    ↓ useQuery returns { data, loading, error }
FeedGrid component → renders FeedCards
    ↓
User reads articles
    ↓ Clicks bookmark
useBookmarks hook → localStorage → cross-tab sync
```

### Coin Detail Data Flow (3-source merge)

```
User clicks coin in Market Intelligence table
    ↓
Router navigates to /crypto/market/bitcoin
    ↓
CoinDetail component mounts
    ↓ 4 useQuery calls in parallel:

1. CoinGecko:    ["market", "coingecko-coin", "bitcoin"]
   → /api/market/coingecko-coin?id=bitcoin
   → edge cache 120s → CoinGecko API
   → returns: price, market cap, ATH/ATL, sparkline, description, links

2. CMC listings: ["market", "cmc-listings", "top100"]
   → ALREADY CACHED from Market Intelligence page (shared cache!)
   → 0 API calls — TanStack Query deduplication

3. CMC coin:     ["market", "cmc-coin", "bitcoin"]
   → /api/market/cmc-coin?slug=bitcoin
   → edge cache 300s → CMC keyless API
   → returns: tags, logo, description, URLs

4. DefiLlama:    ["market", "defillama-protocol", "bitcoin"]
   → /api/market/defillama-protocol?gecko_id=bitcoin
   → edge cache 300s → DefiLlama /v2/protocols
   → returns: TVL (if DeFi protocol), chains, category

5. DefiLlama fees: ["market", "defillama-summary", "bitcoin"]
   → /api/market/defillama-summary?gecko_id=bitcoin
   → edge cache 300s → DefiLlama /overview/fees + /summary/fees
   → returns: fees 24h/7d/30d/1y, methodology, chart data

6. TVL history:  ["market", "defillama-tvl-history", "Ethereum"]
   → /api/market/defillama?path=historicalChainTvl/Ethereum
   → edge cache 300s → DefiLlama /v2/historicalChainTvl
   → returns: 90-day TVL history (only if DeFi protocol)

All 6 queries run in parallel. TanStack Query manages loading states,
error handling, and caching independently for each.
```

---

## 🔄 What Happens When User Navigates

```
User on /crypto/market (Market Intelligence)
  ↓ TanStack Query has:
  - ["market", "coingecko-markets", "top100"] → cached (fresh)
  - ["market", "cmc-listings", "top100"] → cached (fresh)
  - ["market", "global-stats"] → cached (fresh)

User clicks "Bitcoin" → navigates to /crypto/market/bitcoin
  ↓ CoinDetail mounts with 6 useQuery calls:
  - ["market", "coingecko-coin", "bitcoin"] → NOT cached → fetch
  - ["market", "cmc-listings", "top100"] → ALREADY cached! → 0 fetch
  - ["market", "cmc-coin", "bitcoin"] → NOT cached → fetch
  - ["market", "defillama-protocol", "bitcoin"] → NOT cached → fetch
  - ["market", "defillama-summary", "bitcoin"] → NOT cached → fetch
  - ["market", "defillama-tvl-history", "Ethereum"] → NOT cached → fetch

5 new fetches in parallel, 1 shared from cache.

User navigates back to /crypto/market
  ↓ MarketIntelligence mounts:
  - ["market", "coingecko-markets", "top100"] → STILL cached (gcTime 5min)
  → Instant render! 0 API calls.
  → Background: stale? Yes → refetch silently → update when ready.
```

---

## 📈 Resource Consumption Analysis

### Cloudflare Workers Free Tier (100K requests/day)

With edge caching, each API route is called at most once per cache TTL
per Cloudflare region. Assuming 1 active region (e.g., Europe):

| Route | Cache TTL | Max calls/day | Notes |
|---|---|---|---|
| /api/market/binance-ticker | 10s | 8,640 | Only if user keeps tab open |
| /api/market/coingecko-markets | 60s | 1,440 | Shared across all users |
| /api/market/cmc-listings | 60s | 1,440 | Shared |
| /api/market/coingecko-coin | 120s | 720 | Per-coin, but cached per coin |
| /api/feed | 600s | 144 | RSS feeds, slow-changing |
| Other market routes | 300s | ~288 each | F&G, trending, etc. |

**Realistic estimate** (100 active users):
- Each user triggers ~5 API calls on page load (shared via edge cache)
- After first load, subsequent users hit edge cache (0 upstream calls)
- Total invocations/day: ~2,000-3,000 (well within 20K limit)

**Key optimization**: TanStack Query prevents unnecessary client→server
calls. If data is fresh (within staleTime), no fetch is made.

---

_Last updated: 2026-08-19_
