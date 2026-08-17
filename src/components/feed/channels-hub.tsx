"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Send,
  Twitter,
  ExternalLink,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Clock,
  Play,
  Newspaper,
  Check,
} from "lucide-react";
import {
  TELEGRAM_CHANNELS,
  TWITTER_ACCOUNTS,
  CATEGORY_META,
  categoryLabel,
  type TelegramChannel,
  type TwitterAccount,
  type Category,
  type Language,
} from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";
import { relativeTime } from "@/hooks/use-feed-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CUSTOM_CHANNELS_KEY = "acd:custom-channels";

interface CustomChannel {
  type: "telegram" | "twitter";
  handle: string;
  name: string;
  category: Exclude<Category, "all">;
  language: Language;
  addedAt: string;
}

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

function readCustom(): CustomChannel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_CHANNELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustom(items: CustomChannel[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("acd:custom-channels-changed"));
}

const CATEGORIES: Exclude<Category, "all">[] = [
  "crypto",
  "ai",
  "tech",
  "gaming",
  "entertainment",
];

interface ChannelsHubProps {
  lang: Language;
  onOpenBookmarks?: () => void;
}

/**
 * Compact version of the Channels section optimized for sidebar display.
 *
 * Layout:
 *  - Category filter chips (horizontal scroll)
 *  - Active Telegram channel: shows recent posts (1-2 visible at a time)
 *  - Other channels as compact list items (click to switch active)
 *  - X/Twitter accounts as small avatar list at bottom
 */
export function ChannelsHub({ lang, onOpenBookmarks }: ChannelsHubProps) {
  const { t } = useLanguage();
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [activeChannelHandle, setActiveChannelHandle] = useState<string | null>(
    null
  );

  useEffect(() => {
    const load = () => {
      const next = readCustom();
      setCustomChannels(next);
    };
    load();
    window.addEventListener("acd:custom-channels-changed", load);
    return () => window.removeEventListener("acd:custom-channels-changed", load);
  }, []);

  const allTg: (TelegramChannel | (CustomChannel & { type: "telegram" }))[] = [
    ...TELEGRAM_CHANNELS,
    ...customChannels
      .filter((c) => c.type === "telegram")
      .map((c) => ({
        id: `custom-tg-${c.handle}`,
        handle: c.handle,
        name: c.name,
        nameFa: c.name,
        category: c.category,
        language: c.language,
        description: c.name,
        descriptionFa: c.name,
        isCustom: true,
      })),
  ];

  const filteredTg = allTg.filter((ch) => {
    if (ch.language !== lang) return false;
    if (activeCat !== "all" && ch.category !== activeCat) return false;
    return true;
  });

  // Auto-pick first channel when active handle is empty or filter changes
  // (deferred to avoid cascading renders — Rule 2 of effect hook patterns)
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (filteredTg.length === 0) {
        setActiveChannelHandle(null);
        return;
      }
      if (!activeChannelHandle || !filteredTg.some((c) => c.handle === activeChannelHandle)) {
        setActiveChannelHandle(filteredTg[0].handle);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [filteredTg, activeChannelHandle]);

  const activeChannel = filteredTg.find((c) => c.handle === activeChannelHandle);

  const filteredX = TWITTER_ACCOUNTS.filter((acc) => {
    if (acc.language !== lang) return false;
    if (activeCat !== "all" && acc.category !== activeCat) return false;
    return true;
  });

  const removeCustom = useCallback((handle: string, type: "telegram" | "twitter") => {
    const next = readCustom().filter(
      (c) => !(c.handle === handle && c.type === type)
    );
    writeCustom(next);
  }, []);

  return (
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--brand-border)] bg-gradient-to-br from-[var(--brand-accent-soft)] to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[var(--brand-accent)]" />
            <h2 className="text-sm font-bold">
              <span className="text-[var(--brand-text)]">{t.channels.title} </span>
              <span className="text-[var(--brand-accent)]">{t.channels.titleAccent}</span>
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-[var(--brand-muted)] hover:text-[var(--brand-accent)]"
            onClick={onOpenBookmarks}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Category filter chips — modern graphical pills */}
      <div className="px-3 py-2.5 border-b border-[var(--brand-border)]">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <button
            onClick={() => setActiveCat("all")}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap",
              activeCat === "all"
                ? "bg-[var(--brand-accent)] text-[#04201d] font-bold shadow-sm"
                : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30"
            )}
          >
            {activeCat === "all" && <Check className="w-3 h-3" />}
            {t.channels.allCategories}
          </button>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isActive = activeCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn(
                  "shrink-0 flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap group",
                  isActive
                    ? "text-[#04201d] font-bold shadow-sm"
                    : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30"
                )}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${meta.tint}, ${meta.tint}dd)`,
                        boxShadow: `0 2px 8px ${meta.tint}40`,
                      }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125",
                    isActive && "ring-2 ring-[#04201d]/20"
                  )}
                  style={{
                    backgroundColor: isActive ? "#04201d" : meta.tint,
                  }}
                />
                {categoryLabel(cat, lang)}
                {isActive && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active channel preview */}
      <div className="p-3">
        {activeChannel ? (
          <ChannelPreviewCard
            handle={activeChannel.handle}
            channelName={lang === "fa" ? activeChannel.nameFa : activeChannel.name}
            channelDesc={
              lang === "fa"
                ? (activeChannel as TelegramChannel).descriptionFa ||
                  (activeChannel as TelegramChannel).description
                : (activeChannel as TelegramChannel).description
            }
            category={activeChannel.category}
            lang={lang}
          />
        ) : (
          <div className="py-8 text-center">
            <Newspaper className="w-6 h-6 mx-auto mb-2 text-[var(--brand-muted)] opacity-50" />
            <p className="text-xs text-[var(--brand-muted)]">
              {lang === "fa" ? "کانالی در این دسته موجود نیست" : "No channels in this category"}
            </p>
          </div>
        )}
      </div>

      {/* Channel switcher list */}
      {filteredTg.length > 1 && (
        <div className="border-t border-[var(--brand-border)] p-2">
          <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] px-2 py-1.5">
            {t.channels.telegramTitle} ({filteredTg.length})
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto [scrollbar-width:thin]">
            {filteredTg.map((ch) => {
              const meta = CATEGORY_META[ch.category];
              const isActive = ch.handle === activeChannelHandle;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelHandle(ch.handle)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                    isActive
                      ? "bg-[var(--brand-accent-soft)] text-[var(--brand-text)]"
                      : "hover:bg-[var(--brand-surface-2)] text-[var(--brand-muted)]"
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta.tint }}
                  />
                  <span className="truncate flex-1 text-right">
                    {lang === "fa" ? ch.nameFa : ch.name}
                  </span>
                  <span className="text-[10px] font-latin opacity-60">@{ch.handle}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* X/Twitter accounts — compact avatar list */}
      {filteredX.length > 0 && (
        <div className="border-t border-[var(--brand-border)] p-2">
          <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] px-2 py-1.5 flex items-center gap-1.5">
            <Twitter className="w-3 h-3" />
            {t.channels.twitterTitle} ({filteredX.length})
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {filteredX.map((acc) => {
              const meta = CATEGORY_META[acc.category];
              return (
                <a
                  key={acc.id}
                  href={`https://x.com/${acc.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-[var(--brand-surface-2)] transition-colors group"
                  title={lang === "fa" ? acc.nameFa : acc.name}
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--brand-surface-2)] border border-[var(--brand-border)] flex items-center justify-center shrink-0">
                    <Twitter className="w-2.5 h-2.5 text-[var(--brand-text)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-[var(--brand-text)] truncate group-hover:text-[var(--brand-accent)] transition-colors">
                      {lang === "fa" ? acc.nameFa : acc.name}
                    </div>
                  </div>
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ backgroundColor: meta.tint }}
                  />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Preview card showing one channel's recent posts (1-2 visible). */
function ChannelPreviewCard({
  handle,
  channelName,
  channelDesc,
  category,
  lang,
}: {
  handle: string;
  channelName: string;
  channelDesc?: string;
  category: Exclude<Category, "all">;
  lang: Language;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/channel?handle=${encodeURIComponent(handle)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ChannelData = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const meta = CATEGORY_META[category];
  const posts = (data?.posts || []).slice(0, 2);

  return (
    <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-2)]/40 overflow-hidden">
      {/* Channel header */}
      <div className="flex items-center gap-2 p-2.5 border-b border-[var(--brand-border)]">
        <a
          href={`https://t.me/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 min-w-0 group"
        >
          <div className="w-7 h-7 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/20 flex items-center justify-center shrink-0">
            <Send className="w-3 h-3 text-[var(--brand-accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[var(--brand-text)] truncate group-hover:text-[var(--brand-accent)] transition-colors">
              {channelName}
            </div>
            <div className="text-[10px] font-latin text-[var(--brand-muted)] flex items-center gap-1.5">
              @{handle}
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-bold"
                style={{ color: meta.tint }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: meta.tint }}
                />
                {categoryLabel(category, lang)}
              </span>
            </div>
          </div>
        </a>
        <a
          href={`https://t.me/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-surface)] transition-colors shrink-0"
          aria-label="Open on Telegram"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Posts */}
      <div className="p-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center gap-1.5 py-4">
            <Loader2 className="w-3 h-3 animate-spin text-[var(--brand-accent)]" />
            <span className="text-[10px] text-[var(--brand-muted)]">
              {lang === "fa" ? "در حال بارگذاری..." : "Loading..."}
            </span>
          </div>
        ) : !data || data.postCount === 0 ? (
          <div className="py-4 text-center">
            <AlertCircle className="w-3.5 h-3.5 mx-auto mb-1 text-[var(--brand-muted)] opacity-50" />
            <p className="text-[10px] text-[var(--brand-muted)]">
              {data?.isPrivate
                ? lang === "fa"
                  ? "کانال خصوصی است"
                  : "Channel is private"
                : lang === "fa"
                ? "پستی موجود نیست"
                : "No posts available"}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-md border border-[var(--brand-border)] bg-[var(--brand-bg)]/50 overflow-hidden"
            >
              {post.hasMedia && post.images[0] && !imgErrors[post.id] && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative aspect-[16/9] overflow-hidden bg-[var(--brand-bg)]"
                >
                  <img
                    src={post.images[0]}
                    alt={post.text?.slice(0, 60) || "Telegram post"}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgErrors((p) => ({ ...p, [post.id]: true }))
                    }
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {post.videos.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-8 h-8 rounded-full bg-[var(--brand-accent)] flex items-center justify-center">
                        <Play className="w-3 h-3 text-[#04201d] fill-[#04201d]" />
                      </div>
                    </div>
                  )}
                </a>
              )}
              <div className="p-2">
                {post.text && (
                  <p className="text-[11px] text-[var(--brand-text)] leading-relaxed line-clamp-2">
                    {post.text}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1.5 text-[9px] text-[var(--brand-muted)]">
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-latin flex items-center gap-0.5 hover:text-[var(--brand-accent)]"
                  >
                    <Clock className="w-2 h-2" />
                    {post.datetime
                      ? relativeTime(post.datetime, lang, t.feed)
                      : post.timestamp || ""}
                  </a>
                  {post.views && (
                    <span className="font-latin flex items-center gap-0.5">
                      <Eye className="w-2 h-2" />
                      {post.views}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))
        )}

        {/* Show all link */}
        {!loading && data && data.postCount > 0 && (
          <a
            href={`https://t.me/s/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[10px] text-[var(--brand-accent)] hover:underline py-1.5"
          >
            {lang === "fa"
              ? `مشاهده ${data.postCount.toLocaleString("fa-IR")} پست`
              : `View all ${data.postCount} posts`}
            {" "}
            →
          </a>
        )}
      </div>
    </div>
  );
}
