# Deployment Guide — Cloudflare Pages (Free Tier)

This guide walks you through deploying Ai Crypto Discovery to Cloudflare Pages using GitHub integration.

**Cost: $0** — runs entirely on Cloudflare's free tier.

---

## 📋 Prerequisites

1. **GitHub account** — the repo is at `Russia24x/AiCryptoDiscoveryFeed`
2. **Cloudflare account** — sign up free at [cloudflare.com](https://cloudflare.com)
3. **No database needed** — the project is fully stateless

---

## 🚀 Method 1: Cloudflare Dashboard (Recommended)

### Step 1: Log into Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign in (or create a free account)

### Step 2: Create a Pages Project

1. In the left sidebar, click **Workers & Pages**
2. Click **Create application** → **Pages** tab → **Connect to Git**
3. Connect your GitHub account if not already connected
4. Select the repository: `Russia24x/AiCryptoDiscoveryFeed`
5. Click **Begin setup**

### Step 3: Configure Build Settings

Fill in the following:

| Setting | Value |
|---|---|
| **Project name** | `ai-crypto-discovery` (or any name you like) |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `npx @cloudflare/next-on-pages@1` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | `/` (default) |

### Step 4: Environment Variables

**None required.** The project has no mandatory environment variables.

Optional (for future use):
- `NODE_VERSION` = `18` (if Cloudflare doesn't auto-detect)

### Step 5: Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (first build takes ~3-5 minutes)
3. Cloudflare will assign a URL like: `https://ai-crypto-discovery.pages.dev`

### Step 6: Verify

Once deployed, visit your URL. You should see:
- ✅ Homepage loads with hero, ticker, feed grid
- ✅ Articles display with images (lazy-loaded)
- ✅ Telegram channel previews work
- ✅ Article reader opens when clicking a card
- ✅ Language toggle (FA/EN) works

---

## 🔧 Method 2: Wrangler CLI (Advanced)

If you prefer the command line:

### Install Wrangler

```bash
npm install -g wrangler
# or
bun add -g wrangler
```

### Login to Cloudflare

```bash
wrangler login
```

This opens a browser to authenticate.

### Build and Deploy

```bash
cd /path/to/AiCryptoDiscoveryFeed

# Install deps
bun install

# Build for Cloudflare Pages
npx @cloudflare/next-on-pages@1

# Deploy
wrangler pages deploy .vercel/output/static --project-name=ai-crypto-discovery
```

---

## ⚙️ Custom Domain (Optional)

To use your own domain instead of `*.pages.dev`:

1. In Cloudflare Pages → your project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `discovery.yourdomain.com`)
4. Cloudflare will guide you to add a CNAME record
5. SSL is automatically provisioned (free)

---

## 📊 Free Tier Limits

Cloudflare Pages free tier is **very generous** — more than enough for this project:

| Resource | Free Tier Limit | This Project's Usage |
|---|---|---|
| **Builds** | 500 per month | ~10-20 (one per push to `main`) |
| **Bandwidth** | Unlimited | — |
| **Requests** | Unlimited | — |
| **Functions invocations** | 100,000 per day | ~5,000-10,000/day (estimated) |
| **Concurrent builds** | 1 | — |

**You will not hit any free tier limits** under normal usage.

---

## 🔄 Continuous Deployment

Once connected to GitHub, Cloudflare Pages automatically:

1. **Builds on every push to `main`** → deploys to production
2. **Builds on every pull request** → deploys a preview URL (e.g., `pr-123.ai-crypto-discovery.pages.dev`)
3. **Rolls back instantly** if a deploy fails (previous version stays live)

To trigger a new deployment:
```bash
git push origin main
```

Cloudflare builds in ~3-5 minutes. Watch the build log in the Cloudflare dashboard.

---

## 🐛 Troubleshooting

### Build fails with "Cannot find module @cloudflare/next-on-pages"

The adapter is listed in `devDependencies`. Make sure the build command uses `npx`:
```
npx @cloudflare/next-on-pages@1
```

### Build fails with "Node.js version mismatch"

Cloudflare Pages uses Node.js 18 by default. If you need a different version, add an environment variable:
- **Key**: `NODE_VERSION`
- **Value**: `18` (or `20`)

### Articles don't load content

The `/api/article` route fetches HTML from external sites server-side. Some sites may block Cloudflare IPs. Check:
1. Cloudflare dashboard → your project → **Functions** → view logs
2. The route returns `{"error": "Failed to fetch article"}` if the source blocks the request

### Telegram channel preview is empty

This means the channel is private (no public web preview at `t.me/s/<handle>`). The UI will show "Channel is private" with a link to open in Telegram directly.

### Images not loading

Images are lazily fetched via `/api/og-image`. Check:
1. Browser console for errors
2. Network tab — `/api/og-image` should return `{"url": "https://..."}`
3. The source site may block the `og:image` fetch — falls back to placeholder

### "Application error" on page load

This usually means a Turbopack cache issue. The fix:
```bash
rm -rf .next
bun run dev
```

Or for production:
```bash
rm -rf .vercel .next
npx @cloudflare/next-on-pages@1
```

### Function timeout

Cloudflare Pages Functions have a **10-second CPU time limit** on the free tier. Our API routes use:
- `/api/feed`: 5s per source, but sources run concurrently (max 5 at once) — total ~6s
- `/api/article`: 12s timeout — **may exceed CF limit**, but edge cache makes this rare
- `/api/channel`: 12s timeout — same as above
- `/api/og-image`: 8s timeout — within limit
- `/api/prices`: 10s timeout — within limit

If you hit timeouts, the cached response will still be served.

---

## 🔍 Monitoring

### View Build Logs
1. Cloudflare dashboard → Workers & Pages → your project
2. Click the latest deployment → **Build log**

### View Function Logs
1. Cloudflare dashboard → Workers & Pages → your project
2. **Functions** tab → select a route (e.g., `/api/feed`)
3. View real-time invocation logs

### Analytics
Cloudflare provides free analytics:
- Request count
- Bandwidth
- Cache hit rate
- Geographic distribution

---

## 🆘 Getting Help

- **Cloudflare Pages docs**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages/)
- **@cloudflare/next-on-pages**: [github.com/cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- **Project worklog**: `worklog.md` in the repo root

---

## ✅ Deployment Checklist

Before deploying:
- [ ] Code pushed to GitHub `main` branch
- [ ] `bun run lint` passes with 0 errors
- [ ] `bun run dev` works locally
- [ ] No `.env` files in git (verified by `.gitignore`)

After deploying:
- [ ] Homepage loads
- [ ] Feed displays articles
- [ ] Article reader opens on card click
- [ ] Telegram preview shows recent posts
- [ ] Language toggle (FA/EN) works
- [ ] Bookmarks persist across reload
- [ ] Mobile layout responsive

---

_Deployed app URL: add your URL here after deployment._
