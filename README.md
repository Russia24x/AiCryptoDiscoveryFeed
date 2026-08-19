# Ai Crypto Discovery

A modern, bilingual (Persian/English) content discovery + market intelligence platform aggregating live news, crypto prices, weather, and curated social media channels across five verticals: Crypto, AI, Tech, Gaming, and Entertainment.

Built with Next.js 16, TypeScript, Tailwind CSS 4, TanStack Query v5, and shadcn/ui. Deployed on Cloudflare Workers via @opennextjs/cloudflare (free tier) — no database, no credit card required, fully stateless, all user preferences stored in browser localStorage.

---

## ✨ Features

### Content Discovery (Home + Category Pages)
- **5 dedicated category pages**: /crypto, /ai, /tech, /gaming, /entertainment
- **Home = Hub**: Mixed content from all categories with global widgets
- **27 RSS sources** across 5 categories in Persian and English
- **Telegram channel previews** with rich HTML rendering
- **X/Twitter curated accounts** across categories
- **In-app article reader** with 4-strategy HTML extraction
- **Bookmarks + Read-Later queue** (7-day TTL) with tab switcher
- **Search history** with debounced suggestions
- **Bilingual FA/EN** with RTL/LTR support, Persian digit localization
- **Dark/Light/System theme** toggle with CSS logical properties

### Market Intelligence Portal (/crypto/market)
- **Sortable table** of top 100 cryptocurrencies (CoinGecko API)
- **Coin detail page** (/crypto/market/[coin]) with 3-source data merge:
  1. **CoinGecko**: price, market cap, supply, ATH/ATL, sparkline, description, links
  2. **CoinMarketCap (keyless)**: metadata, tags, logo, description, URLs
  3. **DefiLlama**: TVL, fees/revenue, methodology, 90-day TVL chart
- **Watchlist** (localStorage, max 50 coins, star toggle)
- **Price alerts** with browser notifications (Notification API)
- **Category filter** (CMC tags extracted from cached listings)
- **Trending coins** sidebar (CoinGecko trending)
- **Altcoin Season gauge** (computed from CMC listings)
- **Fear & Greed historical chart** (30 days)
- **Global stats bar** (total market cap, BTC/ETH dominance, DeFi)
- **Framer-motion animations** (staggered rows, layout transitions)

### Brand Design
- **Home brand**: "Ai Discovery" (no category-specific word)
- **Crypto brand**: "Ai Crypto Discovery" (full brand)
- **Estedad** display font for headings (modern Persian geometric)
- **Vazirmatn** for body text, **Inter** for Latin/numbers
- **Teal accent** (#2dd4bf), dark charcoal bg (#0d0f12)
- **Glass-morphism** effects, card hover glows

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 (strict mode, noImplicitAny) |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Server State** | TanStack Query v5 (QueryClient) |
| **Client State** | localStorage hooks + Zustand (UI store) |
| **Animations** | Framer Motion (AnimatePresence, layout) |
| **Icons** | lucide-react |
| **Fonts** | Vazirmatn (Persian), Inter (Latin), Estedad (display), JetBrains Mono (code) |
| **Hosting** | Cloudflare Workers (free tier, via @opennextjs/cloudflare) |
| **Package manager** | npm |

---

## 📁 Project Structure

```
ai-crypto-discovery/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home hub page
│   │   ├── crypto/page.tsx             # Crypto category page
│   │   ├── crypto/market/page.tsx     # Market Intelligence portal
│   │   ├── crypto/market/[coin]/page.tsx  # Coin detail page
│   │   ├── ai/page.tsx                 # AI category page
│   │   ├── tech/page.tsx               # Tech category page
│   │   ├── gaming/page.tsx             # Gaming category page
│   │   ├── entertainment/page.tsx      # Entertainment category page
│   │   ├── providers.tsx               # TanStack Query provider
│   │   ├── layout.tsx                  # Root layout (fonts, providers)
│   │   ├── globals.css                 # Brand theme + typography
│   │   └── api/                        # 27 API routes (see below)
│   ├── components/
│   │   ├── brand/                      # Header, Hero, Ticker, Footer, etc.
│   │   ├── feed/                       # FeedCard, FeedGrid, ArticleReader, etc.
│   │   ├── market/                     # MarketIntelligence, CoinDetail
│   │   ├── widgets/                    # CryptoWidgets, WidgetPrimitives
│   │   ├── pages/                      # CategoryPage (shared component)
│   │   └── ui/                         # shadcn/ui components (32 files)
│   ├── hooks/                          # 14 custom hooks (see below)
│   ├── lib/
│   │   ├── query-client.ts             # TanStack Query client singleton
│   │   ├── sources/index.ts            # RSS + Telegram + Twitter sources
│   │   └── utils.ts                    # cn() utility
│   ├── i18n/translations.ts            # FA + EN dictionaries
│   └── types/feed.ts                   # TypeScript types
├── public/                             # Static assets + sw.js (service worker)
├── scripts/                            # Dev watcher, audit scripts
├── prisma/                             # (Unused — no database)
├── next.config.ts                      # Next.js config
├── tsconfig.json                       # TypeScript strict config
├── package.json
└── README.md                           # ← You are here
```

---

## 🔌 API Routes (27 routes)

### Content APIs
| Endpoint | Source | Cache (edge) | Purpose |
|---|---|---|---|
| `/api/feed` | RSS feeds (27 sources) | 600s | Aggregate RSS/Atom feeds |
| `/api/article` | Source website | 600s | Extract full article HTML |
| `/api/channel` | t.me/s/<handle> | 300s | Scrape Telegram channel posts |
| `/api/og-image` | Source website | 3600s | Fetch og:image for cards |
| `/api/prices` | CoinGecko | 60s | 10-coin price ticker (ticker bar) |

### Market Data APIs
| Endpoint | Source | Cache (edge) | Fallback | Purpose |
|---|---|---|---|---|
| `/api/market/binance-ticker` | Binance → Coinbase → CoinGecko | 10s | In-memory | 14-coin real-time ticker |
| `/api/market/fear-greed` | alternative.me | 900s | In-memory | Crypto Fear & Greed Index |
| `/api/market/fear-greed-historical` | alternative.me | 900s | — | Historical F&G (7-365 days) |
| `/api/market/cmc-listings` | CoinMarketCap (keyless) | 60s | In-memory | Top 100 coins with tags |
| `/api/market/cmc-global` | CoinMarketCap (keyless) | 60s | In-memory | Global market metrics |
| `/api/market/cmc-coin` | CoinMarketCap (keyless) | 300s | — | Coin metadata (tags, logo, URLs) |
| `/api/market/cmc-categories` | CoinMarketCap (keyless) | 300s | — | Categories list |
| `/api/market/top-gainers` | Our cmc-listings | 60s | — | Top gainers (24h change >5%) |
| `/api/market/global-stats` | Our cmc-global | 60s | — | Global stats wrapper |
| `/api/market/trending` | CoinGecko | 300s | — | Trending coins (search) |
| `/api/market/coingecko-markets` | CoinGecko | 60s | In-memory + retry | Top 100 markets table |
| `/api/market/coingecko-coin` | CoinGecko | 120s | In-memory + retry | Full coin detail |
| `/api/weather` | Open-Meteo | 600s | — | Weather by lat/lon |
| `/api/weather/geocode` | Open-Meteo Geocoding | 3600s | — | City search worldwide |

> **Note (Phase 21)**: The following API routes were removed to reduce
> resource consumption and Worker exceeded errors:
> - `/api/market/iran-tether` (Wallex/Nobitex geoblocked from Cloudflare Workers)
> - `/api/market/sp500` (Yahoo Finance rate-limits/times out)
> - `/api/market/altcoin-season` (non-essential)
> - `/api/market/defillama`, `/api/market/defillama-protocol`,
>   `/api/market/defillama-summary` (the last one took 11.8s and caused
>   Cloudflare Worker resource limit errors)
> - `/api/market/coingecko-categories` (dead code — was never called from UI)
>
> The TetherWidget and Sp500Widget now show static informational widgets
> with links to nobitex.com and finance.yahoo.com respectively, instead
> of fetching live data that was always failing.

### API Architecture

All API routes use:
- Node.js runtime (default, via OpenNext) — `runtime = "edge"` removed in Phase 21
- `dynamic = "force-dynamic"` — always fresh
- `revalidate = 0` — no ISR
- `Cache-Control: public, s-maxage=X, stale-while-revalidate=Y` — edge caching
- In-memory cache (`let cached = ...`) — fallback when upstream fails
- Fallback chains (`const sources = [tryA, tryB, tryC]`) — multi-source resilience
- Rate-limit detection (HTTP 429) — graceful degradation
- Exponential backoff retry (1 retry, 1s delay) — on CoinGecko routes

---

## 🎣 State Management

### Server State: TanStack Query v5

**QueryClient** (`src/lib/query-client.ts`):
- Singleton instance (one per browser tab, one per edge request)
- `staleTime: 30s` — data considered fresh for 30s
- `gcTime: 5min` — cache kept 5min after last observer unsubscribes
- `retry: 1` — one retry on failure
- `refetchOnWindowFocus: true` — refresh when tab becomes visible
- `refetchOnReconnect: true` — refresh when network reconnects

**Usage pattern** (in components):
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["market", "coingecko-markets", "top100"],
  queryFn: async () => { /* fetch */ },
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
});
```

**Query key hierarchy**: `["namespace", "sub-namespace", "id"]`
- `["market", "binance-ticker", "BTC"]` — BTC from Binance
- `["market", "coingecko-coin", "bitcoin"]` — Bitcoin detail
- `["feed", category, lang, sourceFilter, search]` — RSS feed
- `["weather", lat, lon]` — Weather data

**Shared cache**: When two components use the same `queryKey`, TanStack Query deduplicates the request — only one fetch is made, both receive the same data. Example: `EthWidget` and `SolWidget` both fetch from `/api/market/binance-ticker` — one request, two consumers.

### Client State: localStorage Hooks

| Hook | localStorage Key | Max Items | TTL | Cross-tab |
|---|---|---|---|---|
| `useLanguage` | `acd:lang` | — | — | ✅ |
| `useTheme` | `acd:theme` | — | — | ✅ |
| `useBookmarks` | `acd:bookmarks` | 200 | — | ✅ |
| `useReadLater` | `acd:read-later` | 100 | 7 days | ✅ |
| `useSearchHistory` | `acd:search-history` | 12 | — | ✅ |
| `useWatchlist` | `acd:watchlist` | 50 | — | ✅ |
| `usePriceAlerts` | `acd:price-alerts` | 20 | — | ✅ |
| Weather city | `acd:weather-city` | — | — | ✅ |
| Custom channels | `acd:custom-channels` | — | — | ✅ |
| Feed cache | `acd:feed-cache:*` | — | 5 min | ✅ |

All hooks use:
- Module-level cache variable (for singleton state like language/theme)
- `window.dispatchEvent(new CustomEvent(...))` for same-tab sync
- `storage` event for cross-tab sync
- `useState` + `useEffect` for React integration

### Why not Zustand?

Zustand is listed in `package.json` but **not used**. The project's state management needs are met by:
1. **TanStack Query** for all server state (API data)
2. **localStorage hooks** for all client state (user preferences)
3. **Module-level cache** for singleton state (language, theme)

Zustand would add an abstraction layer without benefit. If future needs require a global client store (e.g., user accounts, multi-tab state synchronization), Zustand can be introduced.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- npm

### Local Development

```bash
git clone https://github.com/Russia24x/AiCryptoDiscoveryFeed.git
cd AiCryptoDiscoveryFeed
npm install --legacy-peer-deps
npm run dev
# Open http://localhost:3000
```

### Production Build (Local)

```bash
npm run build
npm start
```

### Cloudflare Workers Build

```bash
npm run build          # next build (creates .next/)
npm run build:worker   # opennextjs-cloudflare build (creates .open-next/)
# Output: .open-next/worker.js + .open-next/assets/
```

---

## ☁️ Deployment to Cloudflare Workers

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the complete guide.

**Free tier limits (sufficient for this project):**
- 100,000 Worker requests per day
- 10 ms CPU time per request (free) / 50 ms (paid)
- 1.36 MiB gzipped Worker (well under 3 MiB free limit)
- No credit card required (Workers + Static Assets only, no R2)

**Key notes:**
- All API routes run on Node.js runtime (via OpenNext) — `runtime = "edge"` removed
- `@opennextjs/cloudflare` adapter converts Next.js to Cloudflare Workers format
- `wrangler.jsonc` with `nodejs_compat` + `global_fetch_strictly_public` flags
- No R2 binding (project is local-first, all data fetching client-side)
- Worker name: `aidiscovery` (matches Cloudflare Dashboard)

---

## 🌐 Data Sources

### Content (RSS + Social)
- **Persian**: ArzDigital, MihanBlockchain, Digiato, Zoomit, Vigiato, GameFa
- **English**: CoinDesk, Cointelegraph, Decrypt, Bitcoin.com, BeInCrypto, TechCrunch, Ars Technica, Engadget, IGN, Polygon, Variety, Hollywood Reporter
- **Telegram**: @Mastersharkcrypto, @smartainewss
- **X/Twitter**: 8 accounts across categories

### Market Data (All Free, No API Key)
- **CoinMarketCap** (keyless public API): listings, global metrics, coin metadata, categories
- **CoinGecko** (free tier, 30 calls/min): markets, coin detail, trending, categories
- **Binance** (public ticker): real-time prices (with Coinbase + CoinGecko fallback)
- **DefiLlama** (no rate limit): TVL, protocols, fees/revenue, methodology
- **alternative.me**: Fear & Greed Index (current + historical)
- **Yahoo Finance**: S&P 500 index
- **Wallex/Nobitex**: Iranian Tether/Toman price (real market rate)
- **Open-Meteo**: Weather + geocoding (no API key, 10K calls/day)
- **open.er-api.com**: USD→IRR fallback (removed — was showing official rate, not market rate)

---

## ⚙️ Configuration

### Environment Variables
The project requires **no environment variables** for basic operation. All configuration is in the source code.

### TypeScript Configuration
- `strict: true` — all strict checks enabled
- `noImplicitAny: true` — no implicit any
- `noImplicitReturns: true` — all code paths must return
- `ignoreBuildErrors: false` — build fails on TS errors

### Next.js Configuration
- `reactStrictMode: true` — React strict mode
- `typescript.ignoreBuildErrors: false` — fail build on TS errors
- `images.unoptimized: true` — CF Pages doesn't support default loader
- `experimental.optimizePackageImports: ["lucide-react", "framer-motion"]`

---

## 📜 Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server (port 3000, Turbopack) |
| `npm run build` | Production build (Next.js → .next/) |
| `npm run build:worker` | OpenNext Cloudflare build (→ .open-next/) |
| `npm run preview` | Build + preview in workerd (local Cloudflare runtime) |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run cf-typegen` | Generate TypeScript types for Cloudflare bindings |
| `npm run lint` | ESLint check |

---

## 🔒 Privacy & Data

**No backend storage.** The platform is fully stateless:
- **Server-side**: In-memory cache only (cleared on deploy)
- **Client-side**: All user data in browser localStorage
- **No tracking, no cookies, no analytics.** Privacy-first by design.

---

## 🗺 Development Roadmap

### Completed (Phases 1-17)
- ✅ Phases 1-10: Content discovery, bilingual, reader UX, channels, performance
- ✅ Phase 11: &rlm; bug fix, faster ticker, hero widgets, settings, theme toggle, toasts
- ✅ Phase 12: Read-later queue, pull-to-refresh, offline mode, search history
- ✅ Phase 13: Source filter scroll fix, valid Tether price, Binance BTC, Persian font fix
- ✅ Phase 14: Production bug fixes, SP500 widget, weather geocoding, dedicated category pages
- ✅ Phase 15: TypeScript strict + TanStack Query v5 migration + RTL fixes
- ✅ Phase 16: Crypto category widgets + CMC keyless API + Hero tab bar
- ✅ Phase 17: Market Intelligence portal + coin detail (3-source merge) + watchlist + price alerts + categories filter + framer-motion animations + DefiLlama TVL/fees charts

### Planned
- 🔲 Wire up price alerts `checkAlerts()` to BTC ticker polling
- 🔲 WebSocket streaming for live price updates (replace polling)
- 🔲 Article print mode
- 🔲 Saved searches
- 🔲 Per-category widgets for AI, Tech, Gaming, Entertainment pages

---

_Built with ❤️ for the decentralized web._
