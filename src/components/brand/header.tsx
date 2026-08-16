"use client";

import { useEffect, useState } from "react";
import { Search, Menu, X, Github, Moon, Sun } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface HeaderProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

const NAV = [
  { id: "all", label: "خانه" },
  { id: "crypto", label: "ارز دیجیتال" },
  { id: "ai", label: "هوش مصنوعی" },
  { id: "tech", label: "فناوری" },
  { id: "gaming", label: "بازی" },
  { id: "future", label: "آینده‌نگری" },
];

export function Header({
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 shrink-0">
            <Logo size="md" />
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
          <div className="flex items-center gap-2">
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
                    placeholder="جستجو…"
                    className="bg-transparent outline-none text-sm w-40 lg:w-56 placeholder:text-[var(--brand-muted)]"
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
                  aria-label="جستجو"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile: search + menu */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-[var(--brand-muted)] hover:text-[var(--brand-text)]"
              onClick={() => setMobileOpen(true)}
              aria-label="منو"
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
              placeholder="جستجو در محتوا…"
              className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--brand-muted)]"
            />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="w-[280px] bg-[var(--brand-surface)] border-l border-[var(--brand-border)]"
        >
          <SheetHeader>
            <SheetTitle className="text-right">
              <Logo size="md" />
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
          <div className="mt-8 pt-6 border-t border-[var(--brand-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
              <span className="font-latin uppercase tracking-wider">Ai Crypto Discovery</span>
              <span className="font-latin">v1.0</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
