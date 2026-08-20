# Ai24Discovery

A modern, bilingual (Persian/English) content discovery + market intelligence platform aggregating live news, crypto prices, weather, curated social media channels, and space exploration news across **7 verticals**: Crypto, AI Lab, Tech, Gaming, Entertainment, Space, and Social.

Built with Next.js 16, TypeScript, Tailwind CSS 4, TanStack Query v5, Zustand, and Framer Motion. Deployed on Cloudflare Workers via @opennextjs/cloudflare (free tier) — no database, no credit card required, fully stateless, all user preferences stored in browser localStorage.

---

## ✨ Features

### Content Discovery (Home + Category Pages)
- **7 dedicated category pages**: /crypto, /ai, /tech, /gaming, /entertainment, /space, /social
- **Home = Hub**: Mixed content from all categories with global widgets
- **31 RSS sources** across 7 categories in Persian and English
- **pathFilter technology**: Sources like Zoomit (whose category-specific RSS broke after Next.js migration) use the main feed with client-side URL path filtering
- **Telegram channel previews** with rich HTML rendering
- **X/Twitter curated accounts** across categories
- **In-app article reader** with 5-strategy HTML extraction:
  1. JSON-LD `articleBody` (for JS-rendered sites like Digiato)
  2. Content-class div extraction (nesting-aware tokenizer parser)
  3. `<article>` tag extraction (nesting-aware)
  4. `<main>` tag extraction (nesting-aware)
  5. Paragraph fallback (≥5 paragraphs, Persian nav/footer keyword filter)
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
  - Mobile: cards with MiniTrend, category badge, directional border colors
- **Coin detail page** (/crypto/market/[coin]) with multi-source data merge:
  1. **CoinGecko**: price, market cap, supply, ATH/ATL, sparkline, description, links
  2. **CoinMarketCap (keyless)**: metadata, tags, logo, description, URLs
  3. **Shared cache**: geckoMarkets for high/low/ATH/ATL data
- **MarketPulse** — unified market overview (replaces duplicate Stats Bar + MarketOverview):
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
- **Category name below logo** — always English, with category tint color:
  - Crypto → #f7931a (orange)
  - AI Lab → #2dd4bf (teal)
  - Tech → #38bdf8 (blue)
  - Gaming → #a78bfa (purple)
  - Entertainment → #f472b6 (pink)
  - Space → #e8e6e1 (milky white)
  - Social → #ef4444 (red)
- **Logo is LTR-isolated** (`dir="ltr"`) — never mirrors in RTL mode
- **Estedad** display font for headings, **Vazirmatn** for body, **Inter** for Latin/numbers
- **Dark charcoal bg** (#0d0f12), **cream text** (#f4f1ea)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS custom properties |
| Data fetching | TanStack Query v5 (shared cache, refetchOnWindowFocus) |
| State | Zustand (UI store) + localStorage (useSyncExternalStore) |
| Animation | Framer Motion (layout transitions, staggered rows) |
| UI components | shadcn/ui (Sheet, Button, Select, Toast, etc.) |
| Icons | lucide-react |
| Deployment | Cloudflare Workers (@opennextjs/cloudflare) |
| Database | None (stateless, browser-only) |

---

## 📊 Project Stats

| Metric | Count |
|--------|-------|
| TypeScript/TSX files | 121 |
| Lines of code | ~22,000 |
| API routes | 21 |
| Pages | 10 |
| Components | 62 |
| Custom hooks | 20 |
| RSS sources | 31 (Persian + English) |
| Telegram channels | 3 |
| X/Twitter accounts | 8 |
| Categories | 7 (Crypto, AI, Tech, Gaming, Entertainment, Space, Social) |
| Languages | 2 (Persian RTL, English LTR) |
| TypeScript errors | 0 |
| ESLint errors | 0 |

---

## 📰 Sources

### Persian RSS (14 sources)
**Crypto**: ArzDigital Breaking, MihanBlockchain News, MihanBlockchain Learn, Digiato Crypto
**AI**: Digiato AI, Zoomit AI (pathFilter: /ai-articles/)
**Tech**: Digiato Tech, SakhtAfzarMag, ShahrSakhtAfzar
**Gaming**: Vigiato Game Reviews, GameFa Game News
**Entertainment**: GameFa Cinema, Vigiato Cinema & TV, Vigiato Entertainment
**Space**: Zoomit Space (pathFilter: /space/)

### English RSS (17 sources)
**Crypto**: CoinDesk, Cointelegraph, Decrypt, Bitcoin.com News, BeInCrypto
**AI**: TechCrunch AI, VentureBeat AI, The Verge AI
**Tech**: Ars Technica, Engadget, TechCrunch
**Gaming**: IGN, Polygon
**Entertainment**: Variety, The Hollywood Reporter
**Space**: Space.com, NASA News

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
CLOUDFLARE_API_TOKEN=your-token npm run deploy
```

---

## 📁 Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Home (hub)
│   ├── ai/page.tsx             # AI category
│   ├── crypto/                 # Crypto category + market
│   │   ├── page.tsx
│   │   └── market/
│   │       ├── page.tsx        # Market Intelligence portal
│   │       └── [coin]/page.tsx # Coin detail
│   ├── tech/page.tsx           # Tech category
│   ├── gaming/page.tsx         # Gaming category
│   ├── entertainment/page.tsx  # Entertainment category
│   ├── space/page.tsx          # Space category (NEW)
│   ├── social/page.tsx         # Social portal (NEW)
│   ├── api/                    # 21 API routes
│   │   ├── feed/              # RSS aggregation
│   │   ├── article/           # Article extraction
│   │   ├── channel/           # Telegram preview
│   │   ├── prices/            # CMC price ticker
│   │   ├── market/            # 12 market API routes
│   │   ├── weather/           # Open-Meteo weather
│   │   ├── tether/            # Nobitex Tether price
│   │   └── og-image/          # OG image proxy
│   ├── globals.css            # Theme + brand tokens
│   ├── layout.tsx             # Root layout
│   └── providers.tsx          # QueryClient + theme
├── components/
│   ├── brand/                  # Header, Footer, Hero, Logo, Ticker
│   ├── feed/                   # FeedGrid, FeedCard, ArticleReader, Channels
│   ├── market/                 # MarketIntelligence, CoinDetail, UI primitives
│   ├── social/                 # SocialPortal (dedicated /social page)
│   ├── widgets/                # Crypto widgets (ETH, SOL, TopGainers, Dominance)
│   ├── pages/                  # CategoryPage (shared layout)
│   └── ui/                     # shadcn/ui components (30+)
├── hooks/                      # 20 custom hooks
├── lib/
│   ├── sources/index.ts        # Source definitions (RSS + Telegram + Twitter)
│   ├── query-client.ts         # TanStack Query config
│   ├── markdown.ts             # Safe Markdown→HTML renderer
│   └── utils.ts                # cn() helper
└── i18n/
    └── translations.ts         # FA + EN translations
```

---

## 🔧 Configuration

### Environment Variables
- `NEXTJS_ENV` — development/production (in .dev.vars)
- `CLOUDFLARE_API_TOKEN` — for deployment (set in shell, NOT in files)

### Cloudflare Workers
- Worker name: `aidiscovery`
- Compatibility date: 2026-08-18
- Flags: `nodejs_compat`, `global_fetch_strictly_public`
- No R2 buckets (stateless, no DB)
- Worker gzip size: ~1.36 MiB (free tier limit: 3 MiB)

### Caching Strategy
- **TanStack Query**: `refetchOnWindowFocus: true` (global default), per-query `staleTime` (10s–30min depending on data volatility)
- **Edge cache (s-maxage)**: 10s–600s per API route
- **In-memory cache**: Feed (5min), CMC listings (60s), CoinGecko (5min)
- **Browser localStorage**: User preferences, bookmarks, watchlist, custom channels

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
