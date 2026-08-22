# Ai24Discovery

A modern, bilingual (Persian/English) content discovery + market intelligence platform aggregating live news, crypto prices, weather, curated social media channels, and space exploration news across **7 verticals**: Crypto, AI Lab, Tech, Gaming, Entertainment, Space, and Social.

Built with Next.js 16, TypeScript, Tailwind CSS 4, TanStack Query v5, Zustand, and Framer Motion. Deployed on Cloudflare Workers via @opennextjs/cloudflare (free tier) — no database, no credit card required, fully stateless, all user preferences stored in browser localStorage.

---

## ✨ Features

### Content Discovery (Home + Category Pages)
- **7 dedicated category pages**: /crypto, /ai, /tech, /gaming, /entertainment, /space, /social
- **Home = Hub**: Mixed content from all categories with global widgets
- **32 RSS sources** across 7 categories in Persian (15) and English (17)
- **pathFilter technology**: Sources like Zoomit (whose category-specific RSS broke after Next.js migration) use the main feed with client-side URL path filtering
- **Telegram channel previews** with rich HTML rendering (3 channels)
- **X/Twitter curated accounts** across categories (8 accounts)
- **In-app article reader** with 5-strategy HTML extraction:
  1. JSON-LD `articleBody` (for JS-rendered sites like Digiato) — with image harvesting from HTML
  2. Content-class div extraction (nesting-aware tokenizer parser)
  3. `<article>` tag extraction (nesting-aware)
  4. `<main>` tag extraction (nesting-aware)
  5. Paragraph fallback (≥5 paragraphs, Persian nav/footer keyword filter)
- **Lazy-load image fallback**: `data-src`, `data-lazy-src`, `data-lazy-original`, `data-original` attributes checked when `src` is a `data:` URI
- **Bookmarks + Read-Later queue** (7-day TTL) with tab switcher
- **Search history** with debounced suggestions
- **Bilingual FA/EN** with RTL/LTR support, Persian digit localization
- **Dark/Light/System theme** toggle with CSS logical properties

### Social Portal (/social)
- **Dedicated full-page social media viewer** with red brand identity (#ef4444)
- **Channel sidebar** with source filter (All/Telegram/X), search, category filter
- **Full post content** — text, images, view counts, timestamps
- **Show more/less** for long posts
- **Shared TanStack Query cache** with ChannelsHub sidebar (zero duplicate API calls)
- **Twitter account cards** (X blocks scraping — shows link card)

### Market Intelligence Portal (/crypto/market)
- **Sortable table** of top 100 cryptocurrencies
  - Columns: #, Name, Price, 24h%, 7d%, 30d%, Volume, Market Cap, Dominance
  - Sortable by clicking headers, direction toggle
  - Mobile: cards with category badge, directional border colors
- **Coin detail page** (/crypto/market/[coin]) with multi-source data merge:
  1. **CoinGecko**: price, market cap, supply, ATH/ATL, sparkline, description, links
  2. **CoinMarketCap (keyless)**: metadata, tags, logo, description, URLs
  3. **Shared cache**: geckoMarkets for high/low/ATH/ATL data
- **MarketPulse** — unified market overview:
  - 3 hero stats (Sentiment | Total M.Cap | 24h Volume)
  - Dominance donut chart (pure SVG, BTC/ETH/Others segments)
  - 6 breakdown stats (Altcoins, DeFi, Stablecoins, Derivatives, Activity, Top 10%)
- **Watchlist** (localStorage, max 50 coins, star toggle, pinned to top)
- **Price alerts** with browser notifications (Notification API)
- **Category filter bar** with scroll arrows + count badges (TagFilterBar)
- **Trending coins** sidebar, **Top Gainers** sidebar, **Hot Coins** (trending ∩ gainers)
- **Fear & Greed historical chart** (30 days)
- **24h Range Bar** — visual gradient showing current price position
- **ATH/ATL cycle bar** — log-scale positioning between all-time extremes
- **PriceChange magnitude bars** — bidirectional bars for 6 timeframes
- **Supply section** with dual-mode progress (mined/circulation)

### Brand Design
- **Brand name**: **Ai24Discovery**
  - **Ai** → Cyan (#00ffff)
  - **24** → White (#ffffff)
  - **Discovery** → Bright Teal (#2dd4bf)
- **Logo is LTR-isolated** (`dir="ltr"`) — never mirrors in RTL mode
- **Category name below logo** — always English (not translated):
  - Crypto → #f7931a (orange)
  - AI Lab → #2dd4bf (teal) — note: shows "AI Lab" not just "AI"
  - Tech → #38bdf8 (blue)
  - Gaming → #a78bfa (purple)
  - Entertainment → #f472b6 (pink)
  - Space → #e8e6e1 (milky white)
  - Social → #ef4444 (red)
- **Estedad** display font (weights 800, 900) for headings, self-hosted via @fontsource
- **Vazirmatn** (weights 300-900) for Persian body text, self-hosted
- **Inter** (weights 300-900) for Latin/numbers, self-hosted
- **JetBrains Mono** (weights 400, 500, 700) for code, self-hosted
- **Dark charcoal bg** (#0d0f12), **cream text** (#f4f1ea)

### Security
- **CSP + HSTS** headers on all responses (via `next.config.ts` `headers()`)
- **SSRF protection** in proxy routes (`/api/article`, `/api/og-image`): `isBlockedHost()` blocks private/loopback/link-local IPs, post-redirect check, `readBodyCapped()` body size limit
- **XSS prevention**: all user-content HTML passes through `cleanArticleHtml()` whitelist sanitizer; coin descriptions use `markdown.ts` (escape-first Markdown renderer)
- **SW cache isolation**: `/api/article` and `/api/og-image` excluded from Service Worker cache
- **X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy** on all responses

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 + CSS custom properties |
| Data fetching | TanStack Query v5 (shared cache, refetchOnWindowFocus) |
| State | Zustand (UI store) + localStorage (useSyncExternalStore with snapshot caching) |
| Animation | Framer Motion (layout transitions, staggered rows) |
| UI components | shadcn/ui (30 components) |
| Icons | lucide-react |
| Fonts | @fontsource (self-hosted: Estedad, Vazirmatn, Inter, JetBrains Mono) |
| Deployment | Cloudflare Workers (@opennextjs/cloudflare) |
| Database | None (stateless, browser-only) |

---

## 📊 Project Stats

| Metric | Count |
|--------|-------|
| TypeScript/TSX files | 124 |
| Lines of code | ~22,500 |
| API routes | 21 |
| Pages | 10 |
| Components | 62 |
| Custom hooks | 20 |
| Lib utilities | 6 (utils, query-client, fetch-with-timeout, fallback-cache, fetch-guard, markdown) |
| RSS sources | 32 (15 Persian + 17 English) |
| Telegram channels | 3 |
| X/Twitter accounts | 8 |
| Categories | 7 (Crypto, AI, Tech, Gaming, Entertainment, Space, Social) |
| Languages | 2 (Persian RTL, English LTR) |
| i18n keys | ~480 |
| TypeScript errors | 0 |
| ESLint errors | 0 |

---

## 📰 Sources

### Persian RSS (15 sources)

**Crypto (4)**: ArzDigital Breaking, MihanBlockchain News, MihanBlockchain Learn, Digiato Crypto
**AI (2)**: Digiato AI, Zoomit AI (pathFilter: `/ai-articles/`)
**Tech (3)**: Digiato Tech, SakhtAfzarMag, ShahrSakhtAfzar
**Gaming (2)**: Vigiato Game Reviews, GameFa Game News
**Entertainment (3)**: GameFa Cinema, Vigiato Cinema & TV, Vigiato Entertainment
**Space (1)**: Zoomit Space (pathFilter: `/space/`)

### English RSS (17 sources)

**Crypto (5)**: CoinDesk, Cointelegraph, Decrypt, Bitcoin.com News, BeInCrypto
**AI (3)**: TechCrunch AI, VentureBeat AI, The Verge AI
**Tech (3)**: Ars Technica, Engadget, TechCrunch
**Gaming (2)**: IGN, Polygon
**Entertainment (2)**: Variety, The Hollywood Reporter
**Space (2)**: Space.com, NASA News

### Telegram Channels (3)
MasterSharkCrypto (crypto/fa), SmartAINews (ai/fa), Crypto (crypto/en)

### X/Twitter Accounts (8)
Vitalik Buterin, CZ, Balaji, Sam Altman, Andrej Karpathy, Yann LeCun, IGN, Variety

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Build for Cloudflare Workers
npm run build:worker

# Deploy to Cloudflare
npm run deploy  # runs build:worker + opennextjs-cloudflare deploy

# Lint
npm run lint
```

**Requirements**: Node.js 22+, npm (no Bun dependency)

---

## 📁 Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Home (hub)
│   ├── ai/page.tsx             # AI Lab category
│   ├── crypto/                 # Crypto category + market
│   │   ├── page.tsx
│   │   └── market/
│   │       ├── page.tsx        # Market Intelligence portal
│   │       └── [coin]/page.tsx # Coin detail
│   ├── tech/page.tsx           # Tech category
│   ├── gaming/page.tsx         # Gaming category
│   ├── entertainment/page.tsx  # Entertainment category
│   ├── space/page.tsx          # Space category
│   ├── social/page.tsx         # Social portal
│   ├── api/                    # 21 API routes
│   │   ├── feed/              # RSS aggregation (pathFilter, parseFeed limit 60)
│   │   ├── article/           # Article extraction (5 strategies + SSRF guard)
│   │   ├── channel/           # Telegram preview
│   │   ├── prices/            # CMC price ticker
│   │   ├── tether/             # Nobitex Tether/Toman price
│   │   ├── og-image/          # OG image proxy (SSRF guard)
│   │   ├── weather/           # Open-Meteo weather + geocode
│   │   └── market/            # 12 market API routes
│   ├── globals.css            # Theme + brand tokens + font variables
│   ├── layout.tsx             # Root layout (self-hosted fonts)
│   └── providers.tsx          # QueryClient + theme
├── components/
│   ├── brand/                  # Header, Footer, Hero, Logo, Ticker (13)
│   ├── feed/                   # FeedGrid, FeedCard, ArticleReader, Channels (12)
│   ├── market/                 # MarketIntelligence, CoinDetail, UI primitives (3)
│   ├── social/                 # SocialPortal (1)
│   ├── widgets/                # Crypto widgets (2)
│   ├── pages/                  # CategoryPage shared layout (1)
│   └── ui/                     # shadcn/ui components (30)
├── hooks/                      # 20 custom hooks
├── lib/
│   ├── sources/index.ts        # Source definitions (RSS + Telegram + Twitter)
│   ├── query-client.ts        # TanStack Query config (staleTime 60s, gcTime 10min, refetchOnWindowFocus)
│   ├── fetch-with-timeout.ts  # Shared AbortController + setTimeout wrapper
│   ├── fallback-cache.ts      # Module-scope in-memory cache factory (indefinite fallback)
│   ├── fetch-guard.ts         # SSRF protection (isBlockedHost + readBodyCapped)
│   ├── markdown.ts            # Safe Markdown→HTML renderer (escape-first)
│   └── utils.ts                # cn() helper
└── i18n/
    └── translations.ts          # FA + EN translations (~480 keys)
```

---

## 🔧 Configuration

### Environment Variables
- `NEXTJS_ENV` — development/production (in .dev.vars)
- `CLOUDFLARE_API_TOKEN` — for deployment (set in shell, NOT in files)

### Cloudflare Workers
- Worker name: `aidiscovery`
- Compatibility date: `2026-08-18`
- Compatibility flags: `nodejs_compat`, `global_fetch_strictly_public`
- No R2 buckets (stateless, no DB)
- Worker gzip: ~1.36 MiB (free tier limit: 3 MiB)

### Caching Strategy (3 layers)
1. **TanStack Query** (client): `refetchOnWindowFocus: true` (global default), per-query `staleTime` (30s–30min), `gcTime: 10min`, `retry: 1` with exponential backoff
2. **Edge cache** (Cloudflare): `s-maxage` 10s–3600s per API route, `stale-while-revalidate`
3. **In-memory** (Worker): Feed cache (5min, key by feed URL), `createFallbackCache` factory (indefinite stale fallback)

### Service Worker
- Version: `v2.1.0-opennext`
- 4 caches: static, pages, API, images (all versioned)
- LRU eviction: API 50, pages 20, images 100
- `/api/article` and `/api/og-image` excluded from cache (SSRF/XSS safety)
- Offline page: bilingual FA/EN
- Periodic sync: refreshes feed, prices, fear-greed

### Security Headers (via `next.config.ts`)
| Header | Value |
|--------|-------|
| X-Frame-Options | SAMEORIGIN |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Strict-Transport-Security | max-age=63072000; includeSubDomains |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline'; ... |

---

## 📝 Documentation
- [RULES.md](RULES.md) — Git rules (no force-push, session sync check, token hygiene)
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture and data flow
- [AUDIT.md](AUDIT.md) — Security audit and known issues
- [DEPLOYMENT.md](DEPLOYMENT.md) — Cloudflare deployment guide
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development guidelines
- [worklog.md](worklog.md) — Multi-agent work log (40+ tasks)

---

## 📄 License
Private project. All rights reserved.

---

_Built for the decentralized web. Hosted on Cloudflare · Next.js · No database._
