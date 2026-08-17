"use client";

import { useEffect, useState } from "react";
import { Search, Menu, X, Send, Twitter, Github } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/brand/language-toggle";
import { BookmarksButton } from "@/components/feed/bookmarks-drawer";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface HeaderProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onOpenBookmarks: () => void;
}

export function Header({
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
  onOpenBookmarks,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, hydrated: bookmarksHydrated } = useBookmarks();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV = [
    { id: "all", label: t.nav.home },
    { id: "crypto", label: t.nav.crypto },
    { id: "ai", label: t.nav.ai },
    { id: "tech", label: t.nav.tech },
    { id: "gaming", label: t.nav.gaming },
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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => onCategoryChange(item.id)}
                data-active={activeCategory === item.id}
                className={cn(
                  "nav-underline relative px-3 py-2 text-sm font-medium transition-colors",
                  activeCategory === item.id
                    ? "text-[var(--brand-text)]"
                    : "text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1">
            {/* Search (expandable on desktop) */}
            <div className="hidden sm:flex items-center">
              {searchOpen ? (
                <div className="flex items-center gap-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full px-3 py-1.5">
                  <Search className="w-4 h-4 text-[var(--brand-muted)]" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onBlur={() => !search && setSearchOpen(false)}
                    placeholder={t.nav.searchPlaceholder}
                    className="bg-transparent outline-none text-sm w-32 lg:w-48 placeholder:text-[var(--brand-muted)]"
                  />
                  <button
                    onClick={() => {
                      onSearchChange("");
                      setSearchOpen(false);
                    }}
                    className="text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
          <div className="flex items-center gap-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-[var(--brand-muted)] shrink-0" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
              className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--brand-muted)]"
            />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side={lang === "fa" ? "right" : "left"}
          className="w-[280px] bg-[var(--brand-surface)] border-l border-[var(--brand-border)]"
        >
          <SheetHeader>
            <SheetTitle className="text-right">
              <Logo size="md" lang={lang} />
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onCategoryChange(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "text-right px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  activeCategory === item.id
                    ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
                    : "text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface-2)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Language toggle in mobile menu */}
          <div className="mt-6 pt-6 border-t border-[var(--brand-border)]">
            <div className="flex items-center justify-between px-4 mb-2">
              <span className="text-xs text-[var(--brand-muted)] font-latin uppercase tracking-wider">
                {t.nav.language}
              </span>
            </div>
            <div className="px-4">
              <LanguageToggle className="w-full justify-between" />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--brand-border)]">
            <button
              onClick={() => {
                onOpenBookmarks();
                setMobileOpen(false);
              }}
              className="w-full text-right px-4 py-3 rounded-lg text-sm font-medium text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface-2)] transition-colors flex items-center justify-between"
            >
              <span className="font-latin text-xs">
                {count.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
              </span>
              <span>{t.nav.bookmarks}</span>
            </button>
          </div>

          {/* Social media + Telegram channels quick access */}
          <div className="mt-6 pt-6 border-t border-[var(--brand-border)]">
            <div className="px-4 mb-3">
              <span className="text-xs text-[var(--brand-muted)] font-latin uppercase tracking-wider">
                {lang === "fa" ? "شبکه‌های اجتماعی" : "Social Media"}
              </span>
            </div>
            <div className="px-4 grid grid-cols-4 gap-2">
              {/* Telegram channels */}
              <a
                href="https://t.me/Mastersharkcrypto"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-colors"
                title={lang === "fa" ? "کریپتو" : "Crypto TG"}
              >
                <div className="w-9 h-9 rounded-full bg-[#229ED9]/15 flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#229ED9]" />
                </div>
                <span className="text-[9px] text-[var(--brand-muted)] truncate w-full text-center">Crypto</span>
              </a>
              <a
                href="https://t.me/smartainewss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-colors"
                title={lang === "fa" ? "هوش مصنوعی" : "AI TG"}
              >
                <div className="w-9 h-9 rounded-full bg-[#229ED9]/15 flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#229ED9]" />
                </div>
                <span className="text-[9px] text-[var(--brand-muted)] truncate w-full text-center">AI</span>
              </a>
              {/* X/Twitter */}
              <a
                href="https://x.com/VitalikButerin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-colors"
                title="X / Twitter"
              >
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Twitter className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] text-[var(--brand-muted)] truncate w-full text-center">X</span>
              </a>
              {/* GitHub */}
              <a
                href="https://github.com/Russia24x/AiCryptoDiscoveryFeed"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--brand-surface-2)] transition-colors"
                title="GitHub"
              >
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Github className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] text-[var(--brand-muted)] truncate w-full text-center">GitHub</span>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--brand-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
              <span className="font-latin uppercase tracking-wider">
                Ai Crypto Discovery
              </span>
              <span className="font-latin">v1.1</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
