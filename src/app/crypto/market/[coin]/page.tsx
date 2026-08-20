"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/brand/header";
import { Ticker } from "@/components/brand/ticker";
import { Footer } from "@/components/brand/footer";
import { BackToTop } from "@/components/brand/back-to-top";
import { BookmarksDrawer } from "@/components/feed/bookmarks-drawer";
import { SettingsPanel } from "@/components/brand/settings-panel";
import { OfflineBanner } from "@/components/brand/offline-banner";
import { UpdateBanner } from "@/components/brand/update-banner";
import { CoinDetail } from "@/components/market/coin-detail";

export default function CoinDetailPage() {
  const params = useParams<{ coin: string }>();
  const coinId = params.coin;
  const router = useRouter();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-bg)]">
      <Header
        activeCategory="crypto"
        onCategoryChange={(c) => {
          const target = c === "all" ? "/" : `/${c}`;
          router.push(target);
        }}
        search={search}
        onSearchChange={setSearch}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Ticker />
      <OfflineBanner />

      <main className="flex-1">
        <CoinDetail coinId={coinId} />
      </main>

      <Footer />
      <BackToTop />
      <BookmarksDrawer open={bookmarksOpen} onOpenChange={setBookmarksOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      <UpdateBanner />
    </div>
  );
}
