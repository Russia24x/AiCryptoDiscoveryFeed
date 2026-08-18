"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/brand/header";
import { Ticker } from "@/components/brand/ticker";
import { Hero } from "@/components/brand/hero";
import { Footer } from "@/components/brand/footer";
import { BackToTop } from "@/components/brand/back-to-top";
import { FeedGrid } from "@/components/feed/feed-grid";
import { ChannelsHub } from "@/components/feed/channels-hub";
import { BookmarksDrawer } from "@/components/feed/bookmarks-drawer";
import { TrendingTags } from "@/components/feed/trending-tags";
import { SettingsPanel } from "@/components/brand/settings-panel";
import { OfflineBanner } from "@/components/brand/offline-banner";
import { UpdateBanner } from "@/components/brand/update-banner";
import { useFeed } from "@/hooks/use-feed";
import { useLanguage } from "@/hooks/use-language";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { motion } from "framer-motion";
import { CATEGORY_META, categoryLabel, type Category } from "@/lib/sources";

interface CategoryPageProps {
  /** The category this page represents. */
  category: Exclude<Category, "all">;
}

/**
 * Dedicated page for a single category (crypto, ai, tech, gaming, entertainment).
 *
 * Distinct from the home hub page — each category gets its own:
 *  - URL (e.g., /crypto, /ai, /tech, /gaming, /entertainment)
 *  - Hero with category-specific accent color and title
 *  - Category-specific widgets at top (future — currently just uses the
 *    global Hero with widgets)
 *  - Feed filtered to this category only
 *  - Channels hub filtered to this category only
 *
 * The home page (page.tsx) is the "hub" that shows mixed content from
 * all categories. Clicking a nav tab navigates to the category page
 * instead of just filtering the hub feed.
 */
export function CategoryPage({ category }: CategoryPageProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // Local feed hook for trending tags + refresh trigger
  const { data: allData, refetch } = useFeed(category, "", null, lang);

  const meta = CATEGORY_META[category];
  const categoryLabelStr = categoryLabel(category, lang);

  const onTagClick = useCallback(
    (tag: string) => {
      setSearch(tag);
      requestAnimationFrame(() => {
        document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
      });
    },
    []
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

  // Category nav — clicking "Home" goes to /, clicking a category goes to /category
  const onCategoryChange = useCallback(
    (c: string) => {
      if (c === "all") {
        router.push("/");
      } else {
        router.push(`/${c}`);
      }
    },
    [router]
  );

  return (
    <div
      {...touchHandlers}
      className="min-h-screen flex flex-col bg-[var(--brand-bg)] relative"
    >
      <PullIndicator />

      <Header
        activeCategory={category}
        onCategoryChange={onCategoryChange}
        search={search}
        onSearchChange={setSearch}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Ticker />
      <OfflineBanner />

      <main className="flex-1">
        {/* Category hero — simpler than home page hero, with category accent */}
        <section className="relative overflow-hidden border-b border-[var(--brand-border)]">
          {/* Background layers */}
          <div className="absolute inset-0 bg-grid pointer-events-none" />
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] pointer-events-none"
            style={{
              background: `radial-gradient(closest-side, ${meta.tint}30, transparent 70%)`,
            }}
          />
          <div
            className="absolute -bottom-32 -right-24 w-[420px] h-[420px] pointer-events-none"
            style={{
              background: `radial-gradient(closest-side, ${meta.tint}15, transparent 70%)`,
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-latin tracking-wide mb-4"
              style={{
                backgroundColor: `${meta.tint}1a`,
                borderColor: `${meta.tint}40`,
                color: meta.tint,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.tint }}
              />
              <span className="uppercase tracking-[0.2em]">{meta.labelEn}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight"
            >
              <span className="text-[var(--brand-text)]">{categoryLabelStr}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-base md:text-lg text-[var(--brand-muted)] max-w-2xl leading-relaxed mt-4"
            >
              {lang === "fa" ? meta.description : meta.descriptionEn}
            </motion.p>

            {/* TODO: Category-specific widgets will go here in a future phase.
                For now, this section is intentionally empty. */}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="flex items-center gap-3 mt-6 text-xs text-[var(--brand-muted)]"
            >
              <a
                href="#feed"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all hover:brightness-110"
                style={{
                  backgroundColor: meta.tint,
                  color: "#04201d",
                }}
              >
                {lang === "fa" ? "مشاهده فید" : "View feed"} →
              </a>
              <a
                href="#channels"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all hover:bg-[var(--brand-surface)]"
                style={{ borderColor: `${meta.tint}40` }}
              >
                {lang === "fa" ? "شبکه‌ها" : "Channels"} →
              </a>
            </motion.div>
          </div>
        </section>

        {/* HUB LAYOUT — feed + channels side-by-side on desktop */}
        <div id="feed" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
            {/* LEFT — Live feed (filtered to this category) */}
            <div className="min-w-0">
              <FeedGrid
                category={category}
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
      </main>

      <Footer />
      <BackToTop />
      <BookmarksDrawer open={bookmarksOpen} onOpenChange={setBookmarksOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      <UpdateBanner />
    </div>
  );
}
