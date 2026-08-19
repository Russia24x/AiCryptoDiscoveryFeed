"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Twitter, ExternalLink, Plus, X } from "lucide-react";
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
import { TelegramPreview } from "./telegram-preview";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CUSTOM_CHANNELS_KEY = "acd:custom-channels";

interface CustomChannel {
  type: "telegram" | "twitter";
  handle: string;
  name: string;
  category: Exclude<Category, "all">;
  language: Language;
  addedAt: string;
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

export function Channels() {
  const { t, lang } = useLanguage();
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [langFilter, setLangFilter] = useState<Language | "all">("all");
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [view, setView] = useState<"grid" | "feed">("feed");

  useEffect(() => {
    const load = () => setCustomChannels(readCustom());
    load();
    window.addEventListener("acd:custom-channels-changed", load);
    return () => window.removeEventListener("acd:custom-channels-changed", load);
  }, []);

  const tgChannels: TelegramChannel[] = [
    ...TELEGRAM_CHANNELS,
    ...customChannels
      .filter((c) => c.type === "telegram")
      .map((c): TelegramChannel => ({
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

  const xAccounts: TwitterAccount[] = [
    ...TWITTER_ACCOUNTS,
    ...customChannels
      .filter((c) => c.type === "twitter")
      .map((c): TwitterAccount => ({
        id: `custom-x-${c.handle}`,
        handle: c.handle,
        name: c.name,
        nameFa: c.name,
        category: c.category,
        language: c.language,
        isCustom: true,
      })),
  ];

  const filterFn = (
    item: { category: Exclude<Category, "all">; language: Language }
  ) => {
    if (catFilter !== "all" && item.category !== catFilter) return false;
    if (langFilter !== "all" && item.language !== langFilter) return false;
    return true;
  };

  const filteredTg = tgChannels.filter(filterFn);
  const filteredX = xAccounts.filter(filterFn);

  const removeCustom = useCallback((handle: string, type: "telegram" | "twitter") => {
    const next = readCustom().filter(
      (c) => !(c.handle === handle && c.type === type)
    );
    writeCustom(next);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">
            <span className="text-[var(--brand-text)]">{t.channels.title} </span>
            <span className="text-[var(--brand-accent)]">{t.channels.titleAccent}</span>
          </h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)] max-w-xl">
            {t.channels.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle — feed vs grid */}
          <div className="flex items-center bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-md p-0.5">
            <button
              onClick={() => setView("feed")}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold transition-colors",
                view === "feed"
                  ? "bg-[var(--brand-surface-2)] text-[var(--brand-accent)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              )}
            >
              {lang === "fa" ? "پست‌های اخیر" : "Recent posts"}
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold transition-colors",
                view === "grid"
                  ? "bg-[var(--brand-surface-2)] text-[var(--brand-accent)]"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              )}
            >
              {lang === "fa" ? "کارتی" : "Cards"}
            </button>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            variant="outline"
            className="bg-[var(--brand-surface)] border-[var(--brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
          >
            <Plus className="w-4 h-4" />
            {t.channels.addChannel}
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <div className="flex gap-1 flex-wrap">
          <FilterChip
            active={catFilter === "all"}
            onClick={() => setCatFilter("all")}
          >
            {t.channels.allCategories}
          </FilterChip>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <FilterChip
                key={cat}
                active={catFilter === cat}
                onClick={() => setCatFilter(cat)}
                tint={meta.tint}
              >
                {categoryLabel(cat, lang)}
              </FilterChip>
            );
          })}
        </div>

        <span className="mx-2 h-5 w-px bg-[var(--brand-border)] hidden sm:block" />

        <div className="flex gap-1">
          <FilterChip
            active={langFilter === "all"}
            onClick={() => setLangFilter("all")}
          >
            {t.channels.allLanguages}
          </FilterChip>
          <FilterChip
            active={langFilter === "fa"}
            onClick={() => setLangFilter("fa")}
          >
            {t.channels.persian}
          </FilterChip>
          <FilterChip
            active={langFilter === "en"}
            onClick={() => setLangFilter("en")}
          >
            {t.channels.english}
          </FilterChip>
        </div>
      </div>

      {/* Telegram */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--brand-muted)]">
          <Send className="w-4 h-4 text-[var(--brand-accent)]" />
          <span className="font-latin uppercase tracking-wider">
            {t.channels.telegramTitle}
          </span>
          <span className="text-[10px] font-latin text-[var(--brand-muted)]/60" suppressHydrationWarning>
            {filteredTg.length}
          </span>
        </div>

        {filteredTg.length === 0 ? (
          <div className="text-xs text-[var(--brand-muted)] py-6 text-center rounded-lg border border-dashed border-[var(--brand-border)]">
            —
          </div>
        ) : view === "feed" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTg.map((ch) => (
              <TelegramPreview
                key={ch.id}
                handle={ch.handle}
                channelName={lang === "fa" ? ch.nameFa : ch.name}
                category={ch.category}
                description={lang === "fa" ? (ch as TelegramChannel).descriptionFa || (ch as TelegramChannel).description : (ch as TelegramChannel).description}
                postCount={3}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTg.map((ch) => {
              const meta = CATEGORY_META[ch.category];
              const name = lang === "fa" ? ch.nameFa : ch.name;
              const description =
                lang === "fa"
                  ? (ch as TelegramChannel).descriptionFa || (ch as TelegramChannel).description || ""
                  : (ch as TelegramChannel).description || "";
              return (
                <div
                  key={ch.id}
                  className="card-lift group relative block rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
                >
                  <a
                    href={`https://t.me/${ch.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-[var(--brand-accent-soft)] flex items-center justify-center">
                          <Send className="w-4 h-4 text-[var(--brand-accent)]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--brand-text)]">
                            {name}
                          </div>
                          <div className="text-[11px] font-latin text-[var(--brand-muted)]">
                            @{ch.handle}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--brand-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {description && (
                      <p className="text-xs text-[var(--brand-muted)] leading-relaxed mb-3">
                        {description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: "var(--brand-accent-soft)",
                          color: meta?.tint,
                        }}
                      >
                        {categoryLabel(ch.category, lang)}
                      </span>
                      <span className="text-[10px] font-latin text-[var(--brand-muted)] uppercase">
                        {ch.language === "fa" ? "FA" : "EN"}
                      </span>
                    </div>
                  </a>
                  {ch.isCustom && (
                    <button
                      onClick={() => removeCustom(ch.handle, "telegram")}
                      className="absolute top-1 left-1 p-1 rounded bg-[var(--brand-bg)]/80 text-[var(--brand-muted)] hover:text-red-400 transition-colors"
                      aria-label={t.channels.removeChannel}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Twitter / X */}
      <div>
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--brand-muted)]">
          <Twitter className="w-4 h-4 text-[var(--brand-accent)]" />
          <span className="font-latin uppercase tracking-wider">
            {t.channels.twitterTitle}
          </span>
          <span className="text-[10px] font-latin text-[var(--brand-muted)]/60" suppressHydrationWarning>
            {filteredX.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredX.length === 0 ? (
            <div className="col-span-full text-xs text-[var(--brand-muted)] py-6 text-center rounded-lg border border-dashed border-[var(--brand-border)]">
              —
            </div>
          ) : (
            filteredX.map((acc) => {
              const meta = CATEGORY_META[acc.category];
              const name = lang === "fa" ? acc.nameFa : acc.name;
              return (
                <div
                  key={acc.id}
                  className="card-lift group relative flex items-center gap-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
                >
                  <a
                    href={`https://x.com/${acc.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--brand-surface-2)] border border-[var(--brand-border)] flex items-center justify-center shrink-0">
                      <Twitter className="w-4 h-4 text-[var(--brand-text)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--brand-text)] truncate">
                        {name}
                      </div>
                      <div className="text-[11px] font-latin text-[var(--brand-muted)]">
                        @{acc.handle}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          color: meta?.tint,
                          backgroundColor: "var(--brand-accent-soft)",
                        }}
                      >
                        {categoryLabel(acc.category, lang)}
                      </span>
                      <span className="text-[10px] font-latin text-[var(--brand-muted)] uppercase">
                        {acc.language === "fa" ? "FA" : "EN"}
                      </span>
                    </div>
                  </a>
                  {acc.isCustom && (
                    <button
                      onClick={() => removeCustom(acc.handle, "twitter")}
                      className="absolute -top-1.5 -left-1.5 p-1 rounded-full bg-[var(--brand-bg)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-red-400 transition-colors"
                      aria-label={t.channels.removeChannel}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddChannelDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tint,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
        active
          ? "bg-[var(--brand-accent)] text-[#04201d] font-bold"
          : "bg-[var(--brand-surface)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40"
      )}
    >
      {tint && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: active ? "#04201d" : tint,
          }}
        />
      )}
      {children}
    </button>
  );
}

function AddChannelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const [type, setType] = useState<"telegram" | "twitter">("telegram");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Exclude<Category, "all">>("crypto");
  const [language, setLanguage] = useState<Language>(lang);

  const reset = () => {
    setHandle("");
    setName("");
    setCategory("crypto");
    setLanguage(lang);
  };

  const submit = () => {
    const cleanedHandle = handle.replace(/^@/, "").trim();
    if (!cleanedHandle) return;

    const newItem: CustomChannel = {
      type,
      handle: cleanedHandle,
      name: name.trim() || cleanedHandle,
      category,
      language,
      addedAt: new Date().toISOString(),
    };

    const existing = readCustom();
    if (
      existing.some(
        (c) => c.handle === newItem.handle && c.type === newItem.type
      )
    ) {
      return;
    }
    writeCustom([...existing, newItem]);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-md bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--brand-accent)]" />
            {t.channels.addChannel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div>
            <Label className="text-xs text-[var(--brand-muted)] mb-2 block">
              {lang === "fa" ? "نوع منبع" : "Source type"}
            </Label>
            <div className="flex gap-2">
              <button
                onClick={() => setType("telegram")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all",
                  type === "telegram"
                    ? "bg-[var(--brand-accent)] text-[#04201d]"
                    : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                )}
              >
                <Send className="w-3.5 h-3.5" />
                {t.channels.addChannelTelegram}
              </button>
              <button
                onClick={() => setType("twitter")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all",
                  type === "twitter"
                    ? "bg-[var(--brand-accent)] text-[#04201d]"
                    : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                )}
              >
                <Twitter className="w-3.5 h-3.5" />
                {t.channels.addChannelTwitter}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="ch-handle" className="text-xs text-[var(--brand-muted)] mb-2 block">
              {t.channels.addChannelHandle}
            </Label>
            <Input
              id="ch-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t.channels.addChannelHandle}
              className="bg-[var(--brand-surface-2)] border-[var(--brand-border)] text-[var(--brand-text)]"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="ch-name" className="text-xs text-[var(--brand-muted)] mb-2 block">
              {t.channels.addChannelName}
            </Label>
            <Input
              id="ch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.channels.addChannelName}
              className="bg-[var(--brand-surface-2)] border-[var(--brand-border)] text-[var(--brand-text)]"
            />
          </div>

          <div>
            <Label className="text-xs text-[var(--brand-muted)] mb-2 block">
              {t.channels.addChannelCategory}
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Exclude<Category, "all">)}
            >
              <SelectTrigger className="bg-[var(--brand-surface-2)] border-[var(--brand-border)] text-[var(--brand-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--brand-surface-2)] border-[var(--brand-border)] text-[var(--brand-text)]">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel(c, lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-[var(--brand-muted)] mb-2 block">
              {lang === "fa" ? "زبان" : "Language"}
            </Label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("fa")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all",
                  language === "fa"
                    ? "bg-[var(--brand-accent)] text-[#04201d]"
                    : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                )}
              >
                {t.channels.persian}
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all",
                  language === "en"
                    ? "bg-[var(--brand-accent)] text-[#04201d]"
                    : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                )}
              >
                {t.channels.english}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="flex-1 text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
            >
              {t.channels.addChannelCancel}
            </Button>
            <Button
              onClick={submit}
              disabled={!handle.trim()}
              className="flex-1 bg-[var(--brand-accent)] text-[#04201d] hover:brightness-110"
            >
              {t.channels.addChannelSubmit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
