# Ai Crypto Discovery

A modern, bilingual (Persian/English) content discovery platform aggregating live news, prices, and curated social media channels across five verticals: Crypto, AI, Tech, Gaming, and Entertainment.

Built with Next.js 16, TypeScript, Tailwind CSS 4, and shadcn/ui. Designed for Cloudflare Pages (free tier) — no database, fully stateless, all user preferences stored in browser localStorage.

---

## ✨ Features

### Content Discovery
- **27 RSS sources** across 5 categories (crypto, AI, tech, gaming, entertainment) in Persian and English
- **Live crypto price ticker** — 10 coins (BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, TRX, LINK) from CoinGecko API
- **Telegram channel previews** — fetches recent posts with media, text, view counts directly from `t.me/s/<handle>`
- **X/Twitter curated accounts** — 8 influential accounts across categories
- **In-app article reader** — full magazine-style reading experience without leaving the site (server-side proxy fetches + extracts article content from source HTML)
- **Smart image fallback** — when RSS doesn't include images, lazily fetches `og:image` from the source article via a server-side proxy

### Reader UX
- **Reading progress bar** — gradient bar tracking scroll position
- **Font size control** — A-/A+ buttons (9 sizes, 14-24px, persisted to localStorage)
- **Share button** — native share sheet on mobile, clipboard copy on desktop
- **Image lightbox** — full-screen overlay with zoom (0.5x-4x), prev/next navigation, thumbnail strip
- **Keyboard navigation** — ESC closes reader, ← → navigates articles
- **Article extraction** — 4-strategy HTML parser (content classes → `<article>` tag → `<main>` → paragraph fallback) with `og:description` fallback

### Bilingual (FA/EN)
- **Full i18n** — every UI string localized (Persian RTL + English LTR)
- **Language toggle** — FA/EN pill in header, persisted to localStorage, updates `<html lang dir>` automatically
- **Source separation** — Persian UI shows only Persian RSS sources, English UI shows only English sources
- **Digit localization** — Persian digits in FA mode, Latin in EN mode

### Performance
- **IntersectionObserver lazy loading** — og:image fetches deferred until card is within 500px of viewport (84% reduction in initial network load)
- **In-memory feed cache** — 5-minute TTL per source, 80% faster warm cache responses
- **Client-side stale-while-revalidate** — localStorage cache gives instant page loads on repeat visits (~400ms vs 9s first load)
- **Concurrency limiter** — max 5 parallel feed fetches prevents upstream rate limiting
- **Fast-fail timeout** — 5s per source (was 9s), slow sources don't block the entire response

### Bookmarking & Customization
- **Article bookmarks** — localStorage-backed (200-cap), cross-tab sync, header badge with live count
- **Custom Telegram/X channels** — users can add their own channels via dialog (category + language filters)
- **Channel filters** — category + language chips to narrow down channel list
- **Trending tags** — auto-extracted from RSS feed tags, click-to-search

### Brand Design
- **Dark charcoal background** (`#0d0f12`) — soft, not pure black
- **Teal accent** (`#2dd4bf`) — for keywords, numbers, CTAs, logo "Discovery"
- **Cream text** (`#f4f1ea`) — off-white for readability
- **Vazirmatn font** (Persian) + **Inter** (Latin/numbers) + **JetBrains Mono** (code)
- **Flat design** — clean lines, generous negative space, no clichéd crypto icons
- **Card hover glow** — teal-tinted multi-layer box-shadow
- **Hub layout** — feed on left, sticky channels sidebar on right (responsive)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Icons** | lucide-react |
| **Animations** | framer-motion |
| **Fonts** | Vazirmatn (Persian), Inter (Latin), JetBrains Mono (code) — via `next/font/google` |
| **State** | React hooks + custom localStorage hooks (no Zustand/Redux needed) |
| **i18n** | Custom translations dictionary (`src/i18n/translations.ts`) |
| **Hosting** | Cloudflare Pages (free tier) |
| **Build adapter** | `@cloudflare/next-on-pages` |
| **Package manager** | Bun |

---

## 📁 Project Structure

```
ai-crypto-discovery/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── article/route.ts     # Full article content extractor (proxy)
│   │   │   ├── channel/route.ts     # Telegram channel post scraper
│   │   │   ├── feed/route.ts        # RSS aggregator (27 sources, cached)
│   │   │   ├── og-image/route.ts    # og:image fetcher for cards
│   │   │   └── prices/route.ts     # CoinGecko price ticker
│   │   ├── globals.css              # Brand theme + article typography
│   │   ├── layout.tsx               # Root layout (fonts, RTL/LTR)
│   │   └── page.tsx                 # Hub layout (feed + sidebar)
│   ├── components/
│   │   ├── brand/                   # Header, Hero, Footer, Ticker, Logo, etc.
│   │   ├── feed/                    # FeedCard, FeedGrid, ArticleReader, etc.
│   │   └── ui/                      # shadcn/ui components (55+ files)
│   ├── hooks/
│   │   ├── use-bookmarks.ts         # localStorage bookmarks
│   │   ├── use-feed.ts             # Stale-while-revalidate feed hook
│   │   ├── use-feed-state.ts       # URL-synced feed state
│   │   ├── use-language.ts          # Language store (localStorage)
│   │   └── ...
│   ├── i18n/
│   │   └── translations.ts          # FA + EN dictionaries (~600 lines)
│   ├── lib/
│   │   └── sources/
│   │       └── index.ts             # All RSS sources + Telegram/X channels
│   └── types/
│       └── feed.ts                  # FeedItem + FeedResponse types
├── public/                          # Static assets
├── scripts/
│   ├── audit-sources.py             # RSS source audit script
│   └── restart-dev.sh               # Dev server restart helper
├── prisma/                          # (Unused — no database)
├── next.config.ts                   # Next.js config (CF Pages optimized)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── RULES.md                         # Git workflow rules (5 rules)
├── README.md                        # ← You are here
├── DEPLOYMENT.md                    # Cloudflare Pages setup guide
└── CONTRIBUTING.md                  # Development workflow
```

**Stats:**
- 88 TypeScript source files
- 12,879 lines of source code
- 6 API routes
- 68 component files
- 415 lines of CSS (brand theme + article typography)
- 27 RSS sources (10 Persian, 17 English)
- 4 Telegram channels + 8 X/Twitter accounts
- ~600 lines of bilingual translations

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** or **Bun** (recommended)
- A GitHub account (for Cloudflare Pages deployment)

### Local Development

```bash
# Clone the repo
git clone https://github.com/Russia24x/AiCryptoDiscoveryFeed.git
cd AiCryptoDiscoveryFeed

# Install dependencies
bun install
# or: npm install

# Start the dev server
bun run dev
# or: npm run dev

# Open http://localhost:3000
```

The dev server runs on port 3000 with Turbopack for fast hot reloads.

### Production Build (Local)

```bash
# Standard Next.js build
bun run build

# Or Cloudflare Pages build (requires @cloudflare/next-on-pages)
bunx next-on-pages
```

---

## ☁️ Deployment to Cloudflare Pages

**See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the complete step-by-step guide.**

### Quick summary:
1. Push the repo to GitHub
2. Log into Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. Select the `Russia24x/AiCryptoDiscoveryFeed` repository
4. Set build configuration:
   - **Framework preset**: Next.js
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
5. Add environment variables (none required for basic operation)
6. Deploy — Cloudflare builds and deploys automatically on every push to `main`

**Free tier limits (sufficient for this project):**
- 500 builds per month
- Unlimited bandwidth
- Unlimited requests
- 20,000 functions invocations per day

---

## 📊 API Routes

| Endpoint | Purpose | Cache | Timeout |
|---|---|---|---|
| `GET /api/feed?category=&lang=&q=&source=&limit=` | Aggregate RSS feeds | 5-min server + 5-min client | 5s/source |
| `GET /api/article?url=` | Extract full article HTML from source | 10-min edge | 12s |
| `GET /api/channel?handle=` | Scrape Telegram channel posts from `t.me/s/<handle>` | 5-min edge | 12s |
| `GET /api/og-image?url=` | Fetch `og:image` / `twitter:image` from article URL | 1-hour edge | 8s |
| `GET /api/prices` | Live crypto prices from CoinGecko | 1-min edge | 10s |

All routes use server-side proxy (bypasses CORS) and return JSON. No authentication required.

---

## 🌐 Sources

### Persian (FA)
- **Crypto**: ArzDigital (breaking + main), MihanBlockchain (news + learn)
- **AI**: Zoomit
- **Tech**: Digiato (via Feedburner), SakhtAfzarMag
- **Gaming**: Vigiato (game reviews), GameFa (game news)
- **Entertainment**: GameFa (cinema), Vigiato (cinema & TV + entertainment)
- **Telegram**: @Mastersharkcrypto (crypto), @smartainewss (AI)

### English (EN)
- **Crypto**: CoinDesk, Cointelegraph, Decrypt, Bitcoin.com News, BeInCrypto
- **AI**: TechCrunch AI, VentureBeat AI, The Verge AI
- **Tech**: Ars Technica, Engadget, TechCrunch
- **Gaming**: IGN, Polygon
- **Entertainment**: Variety, Hollywood Reporter
- **X/Twitter**: @VitalikButerin, @cz_binance, @balajis, @sama, @karpathy, @ylecun, @IGN, @Variety

To add/remove sources, edit `src/lib/sources/index.ts`.

---

## ⚙️ Configuration

### Environment Variables
The project requires **no environment variables** for basic operation. All configuration is in the source code.

Optional (for future use):
- `COINGECKO_API_KEY` — if you hit CoinGecko free tier rate limits (60 calls/min)

### Customization Points
- **Sources**: `src/lib/sources/index.ts` — add/remove RSS feeds, Telegram channels, X accounts
- **Translations**: `src/i18n/translations.ts` — add/modify UI strings in FA/EN
- **Brand colors**: `src/app/globals.css` — CSS variables (`--brand-bg`, `--brand-accent`, etc.)
- **Fonts**: `src/app/layout.tsx` — Vazirmatn, Inter, JetBrains_Mono via `next/font/google`

---

## 📜 Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | Start dev server (port 3000, Turbopack) |
| `bun run build` | Production build (standard Next.js) |
| `bun run lint` | ESLint check |
| `bunx next-on-pages` | Build for Cloudflare Pages |
| `python3 scripts/audit-sources.py` | Audit all RSS sources for health |
| `bash scripts/restart-dev.sh` | Restart dev server + clear caches |

---

## 🔒 Privacy & Data

**No backend storage.** The platform is fully stateless:
- **Server-side**: In-memory cache only (cleared on deploy)
- **Client-side**: All user data in browser localStorage:
  - `acd:lang` — selected language (fa/en)
  - `acd:bookmarks` — saved articles (max 200)
  - `acd:custom-channels` — user-added Telegram/X channels
  - `acd:reader-font-size` — article reader font size
  - `acd:feed-cache:*` — feed response cache (5-min TTL)

**No tracking, no cookies, no analytics.** Privacy-first by design.

---

## 📄 License

Private project — all rights reserved.

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development workflow, git rules, and coding conventions.

---

## 📞 Links

- **Live site**: (deploy to Cloudflare Pages and add URL here)
- **GitHub repo**: [Russia24x/AiCryptoDiscoveryFeed](https://github.com/Russia24x/AiCryptoDiscoveryFeed)
- **Worklog**: [`worklog.md`](./worklog.md) — detailed development history (8 phases)

---

_Built with ❤️ for the decentralized web._
