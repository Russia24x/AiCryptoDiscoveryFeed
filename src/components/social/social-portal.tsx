"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Send,
  Twitter,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Newspaper,
} from "lucide-react";
import {
  TELEGRAM_CHANNELS,
  TWITTER_ACCOUNTS,
  CATEGORY_META,
  categoryLabel,
  type TelegramChannel,
  type TwitterAccount,
  type Category,
} from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { relativeTime } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";
import { Header } from "@/components/brand/header";
import { Ticker } from "@/components/brand/ticker";
import { Footer } from "@/components/brand/footer";
import { BackToTop } from "@/components/brand/back-to-top";
import { BookmarksDrawer } from "@/components/feed/bookmarks-drawer";
import { SettingsPanel } from "@/components/brand/settings-panel";
import { OfflineBanner } from "@/components/brand/offline-banner";
import { UpdateBanner } from "@/components/brand/update-banner";

/**
 * SocialPortal — dedicated /social page for full social content viewing.
 *
 * Brand color: #ef4444 (red) — distinct from other categories:
 *   crypto: orange, ai: teal, tech: blue, gaming: purple, entertainment: pink
 *   social: red  ← new
 *
 * Architecture:
 *   - Channel sidebar (left): all built-in Telegram channels + X accounts
 *     + user's custom channels. Filterable by source type and category.
 *   - Posts panel (right): full posts from selected channel.
 *   - TanStack Query with 5min staleTime — same queryKey as ChannelsHub
 *     so the cache is SHARED across pages (zero duplicate API calls).
 *
 * No new API endpoints. No new backend resources. Uses existing
 * /api/channel?handle=X endpoint that was already there for the
 * ChannelsHub sidebar widget.
 */

const BRAND_TINT = "#ef4444"; // red

interface CustomChannel {
  type: "telegram" | "twitter";
  handle: string;
  name: string;
  category: Exclude<Category, "all">;
  language: "fa" | "en";
  addedAt: string;
}

const CUSTOM_CHANNELS_KEY = "acd:custom-channels";

interface TelegramPost {
  id: string;
  text: string;
  html: string;
  timestamp?: string;
  datetime?: string;
  views?: string;
  images: string[];
  videos: string[];
  link?: string;
  hasMedia: boolean;
}

interface ChannelData {
  handle: string;
  previewUrl: string;
  posts: TelegramPost[];
  postCount: number;
  isPrivate?: boolean;
  error?: string;
  message?: string;
  fetchedAt?: string;
}

/** Combined channel entry — Telegram or Twitter. */
interface ChannelEntry {
  id: string;
  type: "telegram" | "twitter";
  handle: string;
  name: string;
  category: Exclude<Category, "all">;
  language: "fa" | "en";
  isCustom?: boolean;
}

/** Build the full channel list (built-in + custom). */
function useChannelList(): ChannelEntry[] {
  const customChannels = useLocalStorage<CustomChannel[]>(CUSTOM_CHANNELS_KEY, []);
  return useMemo(() => {
    const tg: ChannelEntry[] = TELEGRAM_CHANNELS.map((c) => ({
      id: c.id,
      type: "telegram" as const,
      handle: c.handle,
      name: c.nameFa /* will be localized at render */,
      category: c.category,
      language: c.language,
    }));
    const tw: ChannelEntry[] = TWITTER_ACCOUNTS.map((c) => ({
      id: c.id,
      type: "twitter" as const,
      handle: c.handle,
      name: c.nameFa,
      category: c.category,
      language: c.language,
    }));
    const custom: ChannelEntry[] = customChannels.map((c, i) => ({
      id: `custom-${c.type}-${c.handle}-${i}`,
      type: c.type,
      handle: c.handle,
      name: c.name || c.handle,
      category: c.category,
      language: c.language,
      isCustom: true,
    }));
    return [...tg, ...tw, ...custom];
  }, [customChannels]);
}

export function SocialPortal() {
  const { lang, t, isRTL } = useLanguage();
  const router = useRouter();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "telegram" | "twitter">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Exclude<Category, "all">>("all");

  const allChannels = useChannelList();

  // Apply filters
  const filteredChannels = useMemo(() => {
    let list = allChannels;
    if (sourceFilter !== "all") {
      list = list.filter((c) => c.type === sourceFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((c) => c.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allChannels, sourceFilter, categoryFilter, search]);

  // Auto-select first channel on mount (only if nothing selected)
  const firstChannelId = filteredChannels[0]?.id;
  if (!selectedChannelId && firstChannelId) {
    // Set the initial selection WITHOUT causing a re-render loop —
    // we use a guarded assignment via useState lazy init.
    // (Calling setSelectedChannelId during render is fine here because
    // we guard it with the !selectedChannelId check.)
    setSelectedChannelId(firstChannelId);
  }

  const selectedChannel = filteredChannels.find((c) => c.id === selectedChannelId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-bg)]">
      <Header
        activeCategory="social"
        onCategoryChange={(c) => {
          const target = c === "all" ? "/" : c === "social" ? "/social" : `/${c}`;
          router.push(target);
        }}
        search={search}
        onSearchChange={setSearch}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        logoVariant="full"
      />
      <Ticker />
      <OfflineBanner />

      <main className="flex-1">
        {/* Brand hero — distinct red tint */}
        <SocialHero lang={lang} t={t} />

        {/* Main split layout: channel sidebar (left) + posts panel (right) */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            {/* LEFT: Channels sidebar */}
            <ChannelSidebar
              channels={filteredChannels}
              selectedId={selectedChannelId}
              onSelect={setSelectedChannelId}
              sourceFilter={sourceFilter}
              onSourceFilter={setSourceFilter}
              categoryFilter={categoryFilter}
              onCategoryFilter={setCategoryFilter}
              search={search}
              onSearchChange={setSearch}
              lang={lang}
              t={t}
            />

            {/* RIGHT: Posts panel */}
            <PostsPanel
              channel={selectedChannel}
              lang={lang}
              t={t}
            />
          </div>
        </div>
      </main>

      <Footer />
      <BackToTop />
      <BookmarksDrawer open={bookmarksOpen} onOpenChange={setBookmarksOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      <UpdateBanner />
    </div>
  );
}

/* ============= Social Hero ============= */
function SocialHero({ lang, t }: { lang: "fa" | "en"; t: any }) {
  return (
    <section
      className="relative overflow-hidden border-b border-[var(--brand-border)]"
      style={{
        background: `linear-gradient(180deg, ${BRAND_TINT}14 0%, transparent 80%)`,
      }}
    >
      {/* Subtle grid backdrop */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-latin uppercase tracking-wider border"
            style={{
              color: BRAND_TINT,
              borderColor: `${BRAND_TINT}40`,
              background: `${BRAND_TINT}10`,
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: BRAND_TINT }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: BRAND_TINT }}
              />
            </span>
            {t.social.badge}
          </span>
        </div>
        <h1 className="font-display text-2xl md:text-4xl font-bold mb-3">
          <span className="text-[var(--brand-text)]">{t.social.title} </span>
          <span style={{ color: BRAND_TINT }}>{t.social.titleAccent}</span>
        </h1>
        <p className="text-sm md:text-base text-[var(--brand-muted)] max-w-2xl leading-relaxed">
          {t.social.description}
        </p>
      </div>
    </section>
  );
}

/* ============= Channel Sidebar (left) ============= */
function ChannelSidebar({
  channels,
  selectedId,
  onSelect,
  sourceFilter,
  onSourceFilter,
  categoryFilter,
  onCategoryFilter,
  search,
  onSearchChange,
  lang,
  t,
}: {
  channels: ChannelEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sourceFilter: "all" | "telegram" | "twitter";
  onSourceFilter: (s: "all" | "telegram" | "twitter") => void;
  categoryFilter: "all" | Exclude<Category, "all">;
  onCategoryFilter: (c: "all" | Exclude<Category, "all">) => void;
  search: string;
  onSearchChange: (s: string) => void;
  lang: "fa" | "en";
  t: any;
}) {
  const categories: ("all" | Exclude<Category, "all">)[] = [
    "all", "crypto", "ai", "tech", "gaming", "entertainment",
  ];

  return (
    <aside className="lg:sticky lg:top-20 space-y-3">
      {/* Source filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--brand-surface)]/60 border border-[var(--brand-border)]">
        {[
          { id: "all" as const, label: t.social.allTab, icon: null },
          { id: "telegram" as const, label: t.social.telegramTab, icon: <Send className="w-3 h-3" /> },
          { id: "twitter" as const, label: t.social.twitterTab, icon: <Twitter className="w-3 h-3" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSourceFilter(tab.id)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all",
              sourceFilter === tab.id
                ? "text-[#04201d] shadow-sm"
                : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
            )}
            style={sourceFilter === tab.id ? { background: BRAND_TINT } : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 w-3.5 h-3.5 text-[var(--brand-muted)] pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.social.searchChannels}
          className="w-full bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full ps-9 pe-3 py-1.5 text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20 transition-all"
        />
      </div>

      {/* Category filter — horizontal scroll with arrow buttons (reuses pattern from market tag filter) */}
      <CategoryFilterBar
        categories={categories}
        activeCategory={categoryFilter}
        onSelect={onCategoryFilter}
        lang={lang}
        t={t}
      />

      {/* Channel list */}
      <div className="space-y-1.5 max-h-[calc(100vh-22rem)] overflow-y-auto pe-1 -me-1 [scrollbar-width:thin]">
        {channels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--brand-muted)]">{t.social.noPosts}</p>
          </div>
        ) : (
          channels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              isSelected={channel.id === selectedId}
              onSelect={() => onSelect(channel.id)}
              lang={lang}
            />
          ))
        )}
      </div>
    </aside>
  );
}

/* ============= Category Filter Bar (mini scrollable) ============= */
function CategoryFilterBar({
  categories,
  activeCategory,
  onSelect,
  lang,
  t,
}: {
  categories: ("all" | Exclude<Category, "all">)[];
  activeCategory: "all" | Exclude<Category, "all">;
  onSelect: (c: "all" | Exclude<Category, "all">) => void;
  lang: "fa" | "en";
  t: any;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((cat) => {
        const isActive = cat === activeCategory;
        const label = cat === "all"
          ? t.social.allCategories
          : categoryLabel(cat as Exclude<Category, "all">, lang);
        const tint = cat === "all" ? BRAND_TINT : (CATEGORY_META[cat as Exclude<Category, "all">]?.tint || BRAND_TINT);
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
              isActive
                ? "text-[#04201d]"
                : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
            )}
            style={isActive ? { background: tint } : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ============= Channel List Item ============= */
function ChannelListItem({
  channel,
  isSelected,
  onSelect,
  lang,
}: {
  channel: ChannelEntry;
  isSelected: boolean;
  onSelect: () => void;
  lang: "fa" | "en";
}) {
  const meta = CATEGORY_META[channel.category];
  const tint = meta?.tint || BRAND_TINT;
  const Icon = channel.type === "telegram" ? Send : Twitter;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-start group",
        isSelected
          ? "bg-[var(--brand-surface-2)] border-[var(--brand-accent)]/40 shadow-sm"
          : "bg-[var(--brand-surface)]/60 border-[var(--brand-border)] hover:border-[var(--brand-accent)]/30 hover:bg-[var(--brand-surface)]"
      )}
    >
      {/* Channel icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
        style={{
          background: `${tint}15`,
          borderColor: `${tint}30`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: tint }} />
      </div>
      {/* Channel info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-bold truncate",
            isSelected ? "text-[var(--brand-text)]" : "text-[var(--brand-text)]"
          )}>
            {channel.name}
          </span>
          {channel.isCustom && (
            <span className="text-[8px] font-latin font-bold px-1 py-0.5 rounded bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] shrink-0">
              +
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--brand-muted)]">
          <span className="font-latin truncate">@{channel.handle}</span>
          <span className="opacity-50">·</span>
          <span className="font-latin uppercase tracking-wide shrink-0" style={{ color: tint }}>
            {categoryLabel(channel.category, lang)}
          </span>
        </div>
      </div>
      {isSelected && (
        <span
          className="w-1 h-8 rounded-full shrink-0"
          style={{ background: BRAND_TINT }}
        />
      )}
    </button>
  );
}

/* ============= Posts Panel (right) ============= */
function PostsPanel({
  channel,
  lang,
  t,
}: {
  channel: ChannelEntry | null;
  lang: "fa" | "en";
  t: any;
}) {
  if (!channel) {
    return (
      <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]/40 p-8 md:p-12 text-center">
        <Send className="w-10 h-10 mx-auto mb-3 text-[var(--brand-muted)] opacity-40" />
        <h2 className="text-base font-bold text-[var(--brand-text)] mb-1">
          {t.social.selectChannel}
        </h2>
        <p className="text-xs text-[var(--brand-muted)] max-w-sm mx-auto">
          {t.social.selectChannelHint}
        </p>
      </div>
    );
  }

  // Twitter accounts have no scrapeable post list (X blocks scraping).
  // Show a link card instead.
  if (channel.type === "twitter") {
    return <TwitterAccountCard channel={channel} lang={lang} t={t} />;
  }

  return <TelegramChannelView channel={channel} lang={lang} t={t} />;
}

/* ============= Telegram Channel View ============= */
function TelegramChannelView({
  channel,
  lang,
  t,
}: {
  channel: ChannelEntry;
  lang: "fa" | "en";
  t: any;
}) {
  // SHARED query key with ChannelsHub so the cache is reused.
  // 5min staleTime — same as ChannelsHub.
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<ChannelData>({
    queryKey: ["channel", channel.handle],
    queryFn: async () => {
      const res = await fetch(
        `/api/channel?handle=${encodeURIComponent(channel.handle)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ChannelData;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  const meta = CATEGORY_META[channel.category];
  const tint = meta?.tint || BRAND_TINT;
  const posts = data?.posts || [];

  return (
    <div className="space-y-4">
      {/* Channel header */}
      <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ background: `${tint}15`, borderColor: `${tint}30` }}
            >
              <Send className="w-5 h-5" style={{ color: tint }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--brand-text)] truncate">
                {channel.name}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-[var(--brand-muted)]">
                <span className="font-latin">@{channel.handle}</span>
                <span className="opacity-50">·</span>
                <span className="font-latin uppercase tracking-wide" style={{ color: tint }}>
                  {categoryLabel(channel.category, lang)}
                </span>
                {!isLoading && data && (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="font-latin">{posts.length} {t.social.postsCount}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]/40 transition-colors disabled:opacity-50"
              aria-label={t.social.refreshing}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </button>
            <a
              href={`https://t.me/${channel.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] text-xs font-bold text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">{t.social.openOriginal}</span>
            </a>
          </div>
        </div>
        {/* Last update */}
        {dataUpdatedAt && (
          <div className="mt-3 pt-3 border-t border-[var(--brand-border)]/50 text-[10px] text-[var(--brand-muted)] flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{t.social.lastUpdate}:</span>
            <span className="font-latin">{relativeTime(new Date(dataUpdatedAt).toISOString(), lang, t.feed)}</span>
            {isFetching && (
              <span className="text-[var(--brand-accent)] ms-2">· {t.social.refreshing}</span>
            )}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-24 rounded shimmer" />
                <div className="h-2 w-12 rounded shimmer" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded shimmer" />
                <div className="h-3 w-3/4 rounded shimmer" />
                <div className="h-3 w-5/6 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-bold text-amber-300 mb-1">
            {t.social.noPosts}
          </p>
          <p className="text-xs text-amber-200/70 mb-4">
            {t.social.noPostsHint}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-black text-xs font-bold hover:brightness-110 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.social.refreshing}
          </button>
        </div>
      )}

      {/* Private channel state */}
      {data?.isPrivate && !isLoading && (
        <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[var(--brand-muted)]" />
          <p className="text-sm font-bold text-[var(--brand-text)] mb-1">
            {t.social.noPosts}
          </p>
          <p className="text-xs text-[var(--brand-muted)] mb-4">
            {t.social.noPostsHint}
          </p>
          <a
            href={`https://t.me/${channel.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{ background: BRAND_TINT, color: "#fff" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t.social.openOriginal}
          </a>
        </div>
      )}

      {/* Posts list */}
      {!isLoading && !error && !data?.isPrivate && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 text-center">
              <Newspaper className="w-8 h-8 mx-auto mb-2 text-[var(--brand-muted)] opacity-50" />
              <p className="text-sm font-bold text-[var(--brand-text)] mb-1">
                {t.social.noPosts}
              </p>
              <p className="text-xs text-[var(--brand-muted)]">
                {t.social.noPostsHint}
              </p>
            </div>
          ) : (
            posts.map((post, idx) => (
              <TelegramPostCard
                key={post.id || idx}
                post={post}
                channelHandle={channel.handle}
                lang={lang}
                t={t}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ============= Telegram Post Card (full content) ============= */
function TelegramPostCard({
  post,
  channelHandle,
  lang,
  t,
}: {
  post: TelegramPost;
  channelHandle: string;
  lang: "fa" | "en";
  t: any;
}) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState(false);

  // Truncate long posts; show "show more" button.
  const MAX_COLLAPSED = 600;
  const isLong = post.text.length > MAX_COLLAPSED;
  const displayText = expanded || !isLong
    ? post.text
    : post.text.slice(0, MAX_COLLAPSED) + "…";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] overflow-hidden hover:border-[var(--brand-accent)]/30 transition-colors"
    >
      {/* Post header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--brand-border)]/50 bg-[var(--brand-surface-2)]/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/30 flex items-center justify-center shrink-0">
            <Send className="w-3 h-3 text-[var(--brand-accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[var(--brand-text)] truncate">
              @{channelHandle}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--brand-muted)]">
              {post.datetime && (
                <>
                  <Clock className="w-2.5 h-2.5" />
                  <span>{relativeTime(post.datetime, lang, t.feed)}</span>
                </>
              )}
              {post.views && (
                <>
                  <span className="opacity-50">·</span>
                  <Eye className="w-2.5 h-2.5" />
                  <span className="font-latin">{post.views}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <a
          href={post.link || `https://t.me/${channelHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-surface-2)] transition-colors"
          aria-label={t.social.openOriginal}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Post media (first image only — keeps it light) */}
      {post.images && post.images.length > 0 && !imgErrors[0] && (
        <div className="px-4 pt-3">
          <img
            src={post.images[0]}
            alt=""
            className="w-full max-h-96 object-cover rounded-lg border border-[var(--brand-border)]"
            loading="lazy"
            onError={() => setImgErrors((prev) => ({ ...prev, [0]: true }))}
          />
        </div>
      )}

      {/* Post text */}
      {displayText && (
        <div className="px-4 py-3">
          <p
            className="text-sm text-[var(--brand-text)] leading-relaxed whitespace-pre-wrap break-words"
            dir="auto"
          >
            {displayText}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[11px] font-bold text-[var(--brand-accent)] hover:underline"
            >
              {expanded
                ? (lang === "fa" ? "نمایش کمتر" : "Show less")
                : (lang === "fa" ? "نمایش بیشتر" : "Show more")}
            </button>
          )}
        </div>
      )}

      {/* Additional images (gallery, max 4) */}
      {post.images && post.images.length > 1 && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
          {post.images.slice(1, 4).map((img, idx) => (
            !imgErrors[idx + 1] && (
              <img
                key={idx}
                src={img}
                alt=""
                className="w-full aspect-square object-cover rounded-md border border-[var(--brand-border)]"
                loading="lazy"
                onError={() => setImgErrors((prev) => ({ ...prev, [idx + 1]: true }))}
              />
            )
          ))}
        </div>
      )}
    </motion.article>
  );
}

/* ============= Twitter Account Card (X blocks scraping) ============= */
function TwitterAccountCard({
  channel,
  lang,
  t,
}: {
  channel: ChannelEntry;
  lang: "fa" | "en";
  t: any;
}) {
  const meta = CATEGORY_META[channel.category];
  const tint = meta?.tint || BRAND_TINT;

  return (
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 md:p-8 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
        style={{ background: `${tint}15`, borderColor: `${tint}30` }}
      >
        <Twitter className="w-7 h-7" style={{ color: tint }} />
      </div>
      <h2 className="text-lg font-bold text-[var(--brand-text)] mb-1">
        {channel.name}
      </h2>
      <p className="text-sm text-[var(--brand-muted)] mb-4 font-latin">
        @{channel.handle}
      </p>
      <p className="text-xs text-[var(--brand-muted)] mb-6 max-w-md mx-auto leading-relaxed">
        {lang === "fa"
          ? "پلتفرم ایکس دسترسی برنامه‌های خارجی برای خواندن پست‌ها را محدود کرده است. برای دیدن آخرین توییت‌ها، اکانت را در خود ایکس باز کنید."
          : "X (Twitter) blocks third-party apps from reading posts. Open the account on X to see the latest tweets."}
      </p>
      <a
        href={`https://x.com/${channel.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all"
        style={{ background: tint, color: "#fff" }}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {t.social.openOriginal}
      </a>
    </div>
  );
}
