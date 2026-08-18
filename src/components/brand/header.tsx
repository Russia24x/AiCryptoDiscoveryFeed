"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Menu, X, Settings, Home, Bitcoin, Brain, Cpu, Gamepad2, Film } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/brand/language-toggle";
import { BookmarksButton } from "@/components/feed/bookmarks-drawer";
import { SearchHistoryDropdown } from "@/components/brand/search-history-dropdown";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useLanguage } from "@/hooks/use-language";
import { useSearchHistory, useSearchDebounce } from "@/hooks/use-search-history";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CATEGORY_META } from "@/lib/sources";

interface HeaderProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
}

const NAV_ICON: Record<string, React.ReactNode> = {
  all:           <Home className="w-3.5 h-3.5" />,
  crypto:        <Bitcoin className="w-3.5 h-3.5" />,
  ai:            <Brain className="w-3.5 h-3.5" />,
  tech:          <Cpu className="w-3.5 h-3.5" />,
  gaming:        <Gamepad2 className="w-3.5 h-3.5" />,
  entertainment: <Film className="w-3.5 h-3.5" />,
};

export function Header({
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
  onOpenBookmarks,
  onOpenSettings,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { count, hydrated: bookmarksHydrated } = useBookmarks();
  const { t, lang } = useLanguage();
  const { addEntry } = useSearchHistory();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track search queries for history (debounced 1.5s after typing stops)
  useSearchDebounce(search, addEntry);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV = [
    { id: "all",           label: t.nav.home },
    { id: "crypto",        label: t.nav.crypto },
    { id: "ai",            label: t.nav.ai },
    { id: "tech",          label: t.nav.tech },
    { id: "gaming",        label: t.nav.gaming },
    { id: "entertainment", label: t.nav.entertainment },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-[var(--brand-bg)]/85 backdrop-blur-xl border-b border-[var(--brand-border)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 shrink-0">
            <Logo size="md" lang={lang} />
          </a>

          {/* Desktop nav — modern button-style pills */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV.map((item) => {
              const isActive = activeCategory === item.id;
              const meta = item.id !== "all" ? CATEGORY_META[item.id as keyof typeof CATEGORY_META] : null;
              const tint = meta?.tint || "#2dd4bf";
              return (
                <button
                  key={item.id}
                  onClick={() => onCategoryChange(item.id)}
                  data-active={isActive}
                  className={cn(
                    "group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all",
                    isActive
                      ? "text-[#04201d]"
                      : "text-[var(--brand-muted)] hover:text-[var(--brand-text)] bg-[var(--brand-surface)]/40 hover:bg-[var(--brand-surface-2)] border border-[var(--brand-border)] hover:border-[var(--brand-accent)]/30"
                  )}
                  style={
                    isActive
                      ? {
                          background: `linear-gradient(135deg, ${tint}, ${tint}dd)`,
                          boxShadow: `0 2px 12px ${tint}40`,
                        }
                      : undefined
                  }
                >
                  <span className={cn("transition-transform", isActive ? "scale-110" : "group-hover:scale-110")}>
                    {NAV_ICON[item.id]}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#04201d]/40" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1">
            {/* Search (expandable on desktop, with history dropdown) */}
            <div className="hidden sm:flex items-center relative">
              {searchOpen ? (
                <div className="relative flex items-center gap-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full px-3 py-1.5">
                  <Search className="w-4 h-4 text-[var(--brand-muted)]" />
                  <input
                    ref={searchInputRef}
                    autoFocus
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setHistoryOpen(true)}
                    onBlur={() => {
                      // Delay to allow click on history item
                      setTimeout(() => {
                        if (!search) setSearchOpen(false);
                      }, 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && search.trim()) {
                        addEntry(search);
                        setHistoryOpen(false);
                      }
                      if (e.key === "Escape") {
                        setHistoryOpen(false);
                        if (!search) setSearchOpen(false);
                      }
                    }}
                    placeholder={t.nav.searchPlaceholder}
                    className="bg-transparent outline-none text-sm w-32 lg:w-48 placeholder:text-[var(--brand-muted)]"
                  />
                  <button
                    onClick={() => {
                      onSearchChange("");
                      setSearchOpen(false);
                      setHistoryOpen(false);
                    }}
                    className="text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <SearchHistoryDropdown
                    query={search}
                    onPick={(q) => {
                      onSearchChange(q);
                      setHistoryOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    onClear={() => {}}
                    open={historyOpen}
                    onOpenChange={setHistoryOpen}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-full hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors"
                  aria-label={t.nav.search}
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              aria-label={lang === "fa" ? "تنظیمات" : "Settings"}
              className="p-2 rounded-full hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors group"
            >
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
            </button>

            {/* Language toggle */}
            <LanguageToggle className="hidden sm:flex" />

            {/* Bookmarks */}
            <BookmarksButton
              count={bookmarksHydrated ? count : 0}
              onClick={onOpenBookmarks}
            />

            {/* Mobile: menu */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              onClick={() => setMobileOpen(true)}
              aria-label={t.nav.menu}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile search row (when not in mobile menu) */}
        <div className="sm:hidden pb-3 -mt-1">
          <div className="relative flex items-center gap-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-[var(--brand-muted)] shrink-0" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setHistoryOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  addEntry(search);
                  setHistoryOpen(false);
                }
              }}
              placeholder={t.nav.searchPlaceholder}
              className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--brand-muted)]"
            />
            <SearchHistoryDropdown
              query={search}
              onPick={(q) => {
                onSearchChange(q);
                setHistoryOpen(false);
              }}
              onClear={() => {}}
              open={historyOpen}
              onOpenChange={setHistoryOpen}
            />
          </div>
        </div>
      </div>

      {/* Mobile menu — modern graphical sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side={lang === "fa" ? "right" : "left"}
          className="w-[300px] bg-[var(--brand-surface)] border-s border-[var(--brand-border)] p-0 overflow-y-auto"
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-[var(--brand-border)] sticky top-0 bg-[var(--brand-surface)] z-10">
            <SheetTitle className="flex items-center justify-between">
              <Logo size="md" lang={lang} />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--brand-surface-2)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors"
                aria-label={t.common.close}
              >
                <X className="w-4 h-4" />
              </button>
            </SheetTitle>
          </SheetHeader>

          {/* Modern graphical category grid */}
          <div className="p-4">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-2 px-1">
              {lang === "fa" ? "دسته‌بندی" : "Category"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((item) => {
                const isActive = activeCategory === item.id;
                const meta = item.id !== "all" ? CATEGORY_META[item.id as keyof typeof CATEGORY_META] : null;
                const tint = meta?.tint || "#2dd4bf";
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onCategoryChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "text-[#04201d]"
                        : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30"
                    )}
                    style={
                      isActive
                        ? {
                            background: `linear-gradient(135deg, ${tint}, ${tint}dd)`,
                            boxShadow: `0 4px 14px ${tint}40`,
                          }
                        : undefined
                    }
                  >
                    {NAV_ICON[item.id]}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="px-4 pb-4 border-t border-[var(--brand-border)] pt-4 space-y-2">
            <button
              onClick={() => {
                onOpenBookmarks();
                setMobileOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-lg bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-sm font-medium text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30 transition-colors"
            >
              <span>{t.nav.bookmarks}</span>
              <span className="font-latin text-xs text-[var(--brand-muted)] bg-[var(--brand-bg)] px-2 py-0.5 rounded-full">
                {count.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
              </span>
            </button>
            <button
              onClick={() => {
                onOpenSettings();
                setMobileOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-lg bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-sm font-medium text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30 transition-colors"
            >
              <span>{lang === "fa" ? "تنظیمات" : "Settings"}</span>
              <Settings className="w-4 h-4 text-[var(--brand-muted)]" />
            </button>
            <a
              href="#channels"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-lg bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-sm font-medium text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30 transition-colors"
            >
              <span>{t.channels.title} {t.channels.titleAccent}</span>
              <span className="text-[var(--brand-muted)]">→</span>
            </a>
          </div>

          {/* Language toggle */}
          <div className="px-4 pb-4 border-t border-[var(--brand-border)] pt-4">
            <div className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-2 px-1">
              {t.nav.language}
            </div>
            <LanguageToggle className="w-full justify-between" />
          </div>

          <div className="px-5 py-4 border-t border-[var(--brand-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
              <span className="font-latin uppercase tracking-wider">
                Ai Crypto Discovery
              </span>
              <span className="font-latin">v1.2</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
