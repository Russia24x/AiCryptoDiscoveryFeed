"use client";

import { Send, Twitter, ExternalLink } from "lucide-react";
import { TELEGRAM_CHANNELS, TWITTER_ACCOUNTS, CATEGORY_META } from "@/lib/sources";

export function Channels() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">
            <span className="text-[var(--brand-text)]">منابع </span>
            <span className="text-[var(--brand-accent)]">دنبال‌شده</span>
          </h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)] max-w-xl">
            کانال‌های تلگرام و اکانت‌های توییتر منتخب در حوزه‌های تخصصی پلتفرم.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram */}
        <div>
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--brand-muted)]">
            <Send className="w-4 h-4 text-[var(--brand-accent)]" />
            <span className="font-latin uppercase tracking-wider">Telegram Channels</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TELEGRAM_CHANNELS.map((ch) => {
              const meta = CATEGORY_META[ch.category];
              return (
                <a
                  key={ch.id}
                  href={`https://t.me/s/${ch.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-lift group block rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-[var(--brand-accent-soft)] flex items-center justify-center">
                        <Send className="w-4 h-4 text-[var(--brand-accent)]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--brand-text)]">
                          {ch.nameFa}
                        </div>
                        <div className="text-[11px] font-latin text-[var(--brand-muted)]">
                          @{ch.handle}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--brand-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-[var(--brand-muted)] leading-relaxed mb-3">
                    {ch.description}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: "var(--brand-accent-soft)",
                      color: meta?.tint,
                    }}
                  >
                    {meta?.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Twitter */}
        <div>
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--brand-muted)]">
            <Twitter className="w-4 h-4 text-[var(--brand-accent)]" />
            <span className="font-latin uppercase tracking-wider">X / Twitter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TWITTER_ACCOUNTS.map((acc) => {
              const meta = CATEGORY_META[acc.category];
              return (
                <a
                  key={acc.id}
                  href={`https://x.com/${acc.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-lift group flex items-center gap-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--brand-surface-2)] border border-[var(--brand-border)] flex items-center justify-center shrink-0">
                    <Twitter className="w-4 h-4 text-[var(--brand-text)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[var(--brand-text)] truncate">
                      {acc.nameFa}
                    </div>
                    <div className="text-[11px] font-latin text-[var(--brand-muted)]">
                      @{acc.handle}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: meta?.tint, backgroundColor: "var(--brand-accent-soft)" }}
                  >
                    {meta?.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
