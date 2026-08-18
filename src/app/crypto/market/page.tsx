"use client";

import { useState } from "react";
import { Header } from "@/components/brand/header";
import { Ticker } from "@/components/brand/ticker";
import { Footer } from "@/components/brand/footer";
import { BackToTop } from "@/components/brand/back-to-top";
import { BookmarksDrawer } from "@/components/feed/bookmarks-drawer";
import { SettingsPanel } from "@/components/brand/settings-panel";
import { OfflineBanner } from "@/components/brand/offline-banner";
import { UpdateBanner } from "@/components/brand/update-banner";
import { MarketIntelligence } from "@/components/market/market-intelligence";
import { useLanguage } from "@/hooks/use-language";

export default function MarketPage() {
  const { lang } = useLanguage();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-bg)]">
      <Header
        activeCategory="crypto"
        onCategoryChange={(c) => {
          if (c === "all") window.location.href = "/";
          else window.location.href = `/${c}`;
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
        <MarketIntelligence />
      </main>

      <Footer />
      <BackToTop />
      <BookmarksDrawer open={bookmarksOpen} onOpenChange={setBookmarksOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      <UpdateBanner />
    </div>
  );
}
