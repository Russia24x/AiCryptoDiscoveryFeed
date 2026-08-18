"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/brand/header";
import { Ticker } from "@/components/brand/ticker";
import { Hero } from "@/components/brand/hero";
import { FutureVision } from "@/components/brand/future-vision";
import { Footer } from "@/components/brand/footer";
import { BackToTop } from "@/components/brand/back-to-top";
import { FeedGrid } from "@/components/feed/feed-grid";
import { ChannelsHub } from "@/components/feed/channels-hub";
import { BookmarksDrawer } from "@/components/feed/bookmarks-drawer";
import { TrendingTags } from "@/components/feed/trending-tags";
import { SettingsPanel } from "@/components/brand/settings-panel";
import { OfflineBanner } from "@/components/brand/offline-banner";
import { UpdateBanner } from "@/components/brand/update-banner";
import { useFeedState } from "@/hooks/use-feed-state";
import { useFeed } from "@/hooks/use-feed";
import { useLanguage } from "@/hooks/use-language";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export default function Home() {
  const router = useRouter();
  const {
    search,
    setSearch,
    sourceFilter,
    setSourceFilter,
  } = useFeedState();
  const { lang } = useLanguage();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Local feed hook used only to feed trending tags (always "all" but localized)
  // and to provide a refresh trigger for pull-to-refresh.
  const { data: allData, refetch } = useFeed("all", "", null, lang);

  const onTagClick = useCallback(
    (tag: string) => {
      setSearch(tag);
      requestAnimationFrame(() => {
        document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
      });
    },
    [setSearch]
  );

  // Navigation: clicking "Home" stays on /, clicking a category goes to /category
  const onCategoryChange = useCallback(
    (c: string) => {
      if (c === "all") {
        // Already on home — just scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push(`/${c}`);
      }
    },
    [router]
  );

  // Pull-to-refresh
  const { touchHandlers, PullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      try {
        const keys = Object.keys(window.localStorage).filter((k) =>
          k.startsWith("acd:feed-cache:")
        );
        keys.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
      await refetch();
      setTimeout(() => window.location.reload(), 200);
    },
  });

  return (
    <div
      {...touchHandlers}
      className="min-h-screen flex flex-col bg-[var(--brand-bg)] relative"
    >
      <PullIndicator />

      <Header
        activeCategory="all"
        onCategoryChange={onCategoryChange}
        search={search}
        onSearchChange={setSearch}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        logoVariant="discovery"
      />
      <Ticker />
      <OfflineBanner />

      <main className="flex-1">
        <Hero
          onOpenSettings={() => setSettingsOpen(true)}
          totalItems={0}
          sourcesOk={0}
          sourcesTried={0}
        />

        {/* HUB LAYOUT — feed + channels side-by-side on desktop.
            Home page shows MIXED content from all categories. */}
        <div id="feed" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
            {/* LEFT — Live feed (all categories mixed) */}
            <div className="min-w-0">
              <FeedGrid
                category="all"
                search={search}
                sourceFilter={sourceFilter}
                onSourceChange={setSourceFilter}
              />
            </div>

            {/* RIGHT — Sticky channels sidebar */}
            <aside
              id="channels"
              className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 lg:pl-0 -mx-4 px-4 lg:mx-0 lg:px-0 scroll-mt-20"
            >
              <ChannelsHub
                lang={lang}
                onOpenBookmarks={() => setBookmarksOpen(true)}
              />

              {/* Trending tags (only when feed data is available) */}
              {allData?.items && allData.items.length > 0 && (
                <div className="mt-6">
                  <TrendingTags items={allData.items} onTagClick={onTagClick} />
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Future vision — full-width below the hub */}
        <div id="vision" className="scroll-mt-20">
          <FutureVision />
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
