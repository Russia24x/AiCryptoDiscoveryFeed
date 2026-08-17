# Contributing Guide

Development workflow and coding conventions for Ai Crypto Discovery.

---

## 🛠 Development Setup

### Prerequisites
- **Bun** (recommended) or Node.js 18+
- A code editor with TypeScript support (VS Code recommended)

### First-time Setup

```bash
# Clone the repo
git clone https://github.com/Russia24x/AiCryptoDiscoveryFeed.git
cd AiCryptoDiscoveryFeed

# Install dependencies
bun install

# Start dev server
bun run dev

# Open http://localhost:3000
```

### Available Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Start dev server (port 3000, Turbopack) |
| `bun run lint` | ESLint check (must pass before commit) |
| `bun run build` | Production build (standard Next.js) |
| `bunx next-on-pages` | Build for Cloudflare Pages |
| `python3 scripts/audit-sources.py` | Audit all RSS sources for health |
| `bash scripts/restart-dev.sh` | Restart dev server + clear caches |

---

## 📜 Git Workflow Rules

**Read [`RULES.md`](./RULES.md) for the complete rules.** Summary:

### Rule 1: NEVER-FORCE-PUSH
`git push --force` is **ABSOLUTELY FORBIDDEN**. If a normal push is rejected:
1. **STOP** — don't retry or force
2. **Report** the error to the user
3. **Wait** for explicit decision

### Rule 2: SESSION-START-SYNC-CHECK
At the start of every session:
```bash
git fetch origin
git rev-list --left-right --count origin/main...HEAD
```
- `0 0` = synced → ✅ proceed
- `0 N` = ahead only → ✅ proceed (N commits to push)
- `M 0` = behind → ⚠️ STOP, pull first
- `M N` = diverged → ⚠️ STOP, ask user

### Rule 3: Token Hygiene
- Never commit `.env`, API keys, or tokens
- GitHub PATs stored in `~/.git-credentials` (600 perms) — never in `.git/config`
- If a token is leaked in chat, revoke it immediately

### Rule 4: Pre-push Safety Net
Before every push:
```bash
git log --oneline origin/main..HEAD      # verify commits
git diff --name-only origin/main..HEAD   # check for sensitive files
```

### Rule 5: Credential Helper
The repo uses `git config --global credential.helper store` with `~/.git-credentials` (600 perms). This persists the PAT across sessions without embedding it in URLs.

---

## 🔄 Commit Workflow

### 1. Sync Check
```bash
git fetch origin
git rev-list --left-right --count origin/main...HEAD
# Should be 0 0 (synced) or 0 N (ahead)
```

### 2. Make Changes
- Edit files in `src/`
- Run `bun run lint` to verify no errors
- Test with `bun run dev`

### 3. Stage + Commit
```bash
git add -A
git commit -m "feat: short description

Detailed explanation of what changed and why.

Refs: User request / issue #123."
```

**Commit message conventions:**
- `feat:` — new feature
- `fix:` — bug fix
- `perf:` — performance improvement
- `docs:` — documentation
- `chore:` — maintenance, cleanup
- `refactor:` — code restructuring

### 4. Pre-push Safety
```bash
# Verify no sensitive files
git diff --name-only origin/main..HEAD | grep -E "\.(env|pem|key|db|pid|log)$"
# Should output nothing

# Verify commits
git log --oneline origin/main..HEAD
```

### 5. Push
```bash
git push origin main
```

If push is rejected (non-fast-forward):
1. **STOP** — don't force
2. Run `git fetch origin` and check divergence
3. If behind: `git pull --rebase origin main`
4. If diverged: report to user, ask for decision

---

## 📁 Code Organization

### Source Structure
```
src/
├── app/
│   ├── api/              # API routes (server-side)
│   │   ├── article/      # Article content extractor
│   │   ├── channel/      # Telegram post scraper
│   │   ├── feed/          # RSS aggregator
│   │   ├── og-image/      # og:image fetcher
│   │   └── prices/        # CoinGecko prices
│   ├── globals.css       # Brand theme + article typography
│   ├── layout.tsx         # Root layout (fonts, RTL/LTR)
│   └── page.tsx           # Hub layout (feed + sidebar)
├── components/
│   ├── brand/             # Header, Hero, Footer, Ticker, Logo
│   ├── feed/              # FeedCard, FeedGrid, ArticleReader, SmartImage
│   └── ui/                # shadcn/ui components (don't edit)
├── hooks/                 # Custom React hooks
├── i18n/                  # Translations (FA + EN)
├── lib/
│   └── sources/           # RSS sources + Telegram/X channels
└── types/                 # TypeScript types
```

### Naming Conventions
- **Components**: PascalCase (`FeedCard.tsx`, `ArticleReader.tsx`)
- **Hooks**: camelCase with `use-` prefix (`use-bookmarks.ts`, `use-feed.ts`)
- **API routes**: kebab-case directories (`/api/og-image/`)
- **CSS classes**: kebab-case (`.article-body`, `.card-lift`)
- **Types**: PascalCase interfaces (`FeedItem`, `ArticleData`)

### Import Order
```typescript
// 1. React/Next
import { useState } from "react";
import { NextResponse } from "next/server";

// 2. Third-party
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";

// 3. Local (using @/ alias)
import { useLanguage } from "@/hooks/use-language";
import { SmartImage } from "./smart-image";

// 4. Types
import type { FeedItem } from "@/types/feed";
```

---

## 🌐 Adding a New RSS Source

Edit `src/lib/sources/index.ts`:

```typescript
{
  id: "my-source-id",           // unique, kebab-case
  name: "Source Name",          // English name
  nameFa: "نام منبع",           // Persian name
  url: "https://example.com",   // homepage
  feed: "https://example.com/feed",  // RSS URL
  category: "crypto",           // crypto | ai | tech | gaming | entertainment
  language: "fa",               // fa | en
  icon: "bitcoin",              // lucide-react icon name
},
```

After adding, run the audit:
```bash
python3 scripts/audit-sources.py
```

Verify the source shows ✅ with items > 0.

---

## 🌐 Adding a New UI String

Edit `src/i18n/translations.ts`:

```typescript
// In the TranslationKeys interface:
interface TranslationKeys {
  // ...
  mySection: {
    myKey: string;
  };
}

// In the `fa` object:
fa: {
  // ...
  mySection: {
    myKey: "متن فارسی",
  },
},

// In the `en` object:
en: {
  // ...
  mySection: {
    myKey: "English text",
  },
},
```

Then use in a component:
```typescript
const { t } = useLanguage();
return <p>{t.mySection.myKey}</p>;
```

---

## 🎨 Brand Colors

Defined in `src/app/globals.css` as CSS variables:

| Variable | Value | Usage |
|---|---|---|
| `--brand-bg` | `#0d0f12` | Background (dark charcoal) |
| `--brand-surface` | `#15181d` | Card background |
| `--brand-surface-2` | `#1c2027` | Hover background |
| `--brand-border` | `#262b34` | Borders |
| `--brand-accent` | `#2dd4bf` | Teal accent (CTAs, highlights) |
| `--brand-accent-soft` | `rgba(45, 212, 191, 0.12)` | Accent background |
| `--brand-text` | `#f4f1ea` | Primary text (cream) |
| `--brand-muted` | `#8b94a3` | Secondary text |

---

## 🧪 Testing

### Manual QA via Agent Browser

```bash
# Open the page
agent-browser open http://localhost:3000

# Check for errors
agent-browser errors
agent-browser console

# Take screenshot
agent-browser screenshot screenshot.png

# Inspect DOM
agent-browser eval "JSON.stringify({
  totalArticles: document.querySelectorAll('article').length,
  hasSidebar: !!document.querySelector('aside')
})"
```

### Source Audit

```bash
python3 scripts/audit-sources.py
```

Verifies all RSS sources return items and reports timing/errors.

---

## 🚨 Common Issues

### Turbopack Cache Corruption
If you see "Application error" after changes:
```bash
bash scripts/restart-dev.sh
```
This kills the dev server, clears `.next/` and `node_modules/.cache`, and restarts.

### Lint Errors
```bash
bun run lint
```
Must pass with 0 errors before committing. Fix warnings too.

### Build Fails on Cloudflare
- Check that `@cloudflare/next-on-pages` is in `devDependencies`
- Verify build command: `npx @cloudflare/next-on-pages@1`
- Build output: `.vercel/output/static`

---

## 📝 Worklog Convention

Update `worklog.md` after completing each phase of work:

```markdown
## Task ID: N — Phase N: [Title]
**Agent**: [agent name]
**Task**: [what was requested]

### Work Log
- [what was done]

### Stage Summary
- [key results]

### Unresolved Issues / Risks
1. [issue]
```

---

## 🤝 Questions?

- Check [`worklog.md`](./worklog.md) for detailed development history
- Check [`RULES.md`](./RULES.md) for git workflow rules
- Check [`README.md`](./README.md) for project overview
- Check [`DEPLOYMENT.md`](./DEPLOYMENT.md) for deployment guide
