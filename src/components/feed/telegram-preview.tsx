"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Send,
  ExternalLink,
  Eye,
  Clock,
  Play,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { relativeTime } from "@/hooks/use-feed-state";
import { CATEGORY_META, categoryLabel } from "@/lib/sources";
import { cn } from "@/lib/utils";

interface TelegramPreviewProps {
  handle: string;
  channelName: string;
  category: string;
  description?: string;
  /** Number of recent posts to show — defaults to 3 */
  postCount?: number;
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

export function TelegramPreview({
  handle,
  channelName,
  category,
  description,
  postCount = 3,
}: TelegramPreviewProps) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const fetchChannel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channel?handle=${encodeURIComponent(handle)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ChannelData = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  const meta = CATEGORY_META[category as keyof typeof CATEGORY_META];
  const posts = (data?.posts || []).slice(0, expanded ? 6 : postCount);

  return (
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] overflow-hidden">
      {/* Channel header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--brand-border)] bg-gradient-to-br from-[var(--brand-accent-soft)] to-transparent">
        <a
          href={`https://t.me/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/20 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 text-[var(--brand-accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[var(--brand-text)] truncate group-hover:text-[var(--brand-accent)] transition-colors">
              {channelName}
            </div>
            <div className="text-[11px] font-latin text-[var(--brand-muted)] flex items-center gap-2">
              @{handle}
              {meta && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold"
                  style={{ color: meta.tint }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: meta.tint }}
                  />
                  {categoryLabel(category as any, lang)}
                </span>
              )}
            </div>
          </div>
        </a>
        <a
          href={`https://t.me/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-surface-2)] transition-colors shrink-0"
          aria-label="Open on Telegram"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Body — posts list */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-accent)]" />
            <span className="text-xs text-[var(--brand-muted)]">
              {lang === "fa" ? "در حال بارگذاری پست‌های اخیر..." : "Loading recent posts..."}
            </span>
          </div>
        ) : !data || data.postCount === 0 ? (
          <div className="py-6 text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-2 text-[var(--brand-muted)] opacity-50" />
            <p className="text-xs text-[var(--brand-muted)]">
              {data?.isPrivate
                ? lang === "fa"
                  ? "این کانال خصوصی است یا پیش‌نمایش وب ندارد"
                  : "Channel is private or has no web preview"
                : lang === "fa"
                ? "پستی برای نمایش یافت نشد"
                : "No posts available"}
            </p>
            <a
              href={`https://t.me/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--brand-accent)] hover:underline"
            >
              {lang === "fa" ? "باز کردن در تلگرام" : "Open in Telegram"}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-2)]/60 overflow-hidden hover:border-[var(--brand-accent)]/30 transition-colors"
                >
                  {/* Media */}
                  {post.hasMedia && post.images[0] && !imgErrors[post.id] && (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-[16/9] overflow-hidden bg-[var(--brand-bg)]"
                    >
                      <img
                        src={post.images[0]}
                        alt={post.text?.slice(0, 80) || "Telegram post"}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgErrors((p) => ({ ...p, [post.id]: true }))
                        }
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {post.videos.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-10 h-10 rounded-full bg-[var(--brand-accent)] flex items-center justify-center">
                            <Play className="w-4 h-4 text-[#04201d] fill-[#04201d]" />
                          </div>
                        </div>
                      )}
                    </a>
                  )}

                  {/* Text */}
                  <div className="p-3">
                    {post.text && (
                      <p className="text-xs md:text-[13px] text-[var(--brand-text)] leading-relaxed line-clamp-3">
                        {post.text}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--brand-muted)]">
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-latin flex items-center gap-1 hover:text-[var(--brand-accent)] transition-colors"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {post.datetime
                          ? relativeTime(post.datetime, lang, t.feed)
                          : post.timestamp || ""}
                      </a>
                      {post.views && (
                        <span className="font-latin flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          {post.views}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Expand / Collapse */}
            {data.postCount > postCount && (
              <button
                onClick={() => setExpanded((x) => !x)}
                className="w-full mt-2 text-xs text-[var(--brand-accent)] hover:underline py-2"
              >
                {expanded
                  ? lang === "fa"
                    ? "نمایش کمتر"
                    : "Show less"
                  : lang === "fa"
                  ? `نمایش ${data.postCount.toLocaleString("fa-IR")} پست`
                  : `Show all ${data.postCount} posts`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
