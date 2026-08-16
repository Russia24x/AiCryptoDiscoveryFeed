"use client";

import { useCallback } from "react";
import { Header } from "@/components/brand/header";
import { Ticker } from "@/components/brand/ticker";
import { Hero } from "@/components/brand/hero";
import { FutureVision } from "@/components/brand/future-vision";
import { Footer } from "@/components/brand/footer";
import { FeedGrid } from "@/components/feed/feed-grid";
import { Channels } from "@/components/feed/channels";
import { TrendingTags } from "@/components/feed/trending-tags";
import { useFeedState } from "@/hooks/use-feed-state";
import { useFeedStats } from "@/hooks/use-feed-stats";
import { useFeed } from "@/hooks/use-feed";

export default function Home() {
  const { category, onCategoryChange, search, setSearch } = useFeedState();
  const stats = useFeedStats();

  // Local feed hook used only to feed trending tags (always "all")
  const { data: allData } = useFeed("all", "");

  const onTagClick = useCallback(
    (tag: string) => {
      setSearch(tag);
      requestAnimationFrame(() => {
        document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
      });
    },
    [setSearch]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-bg)]">
      <Header
        activeCategory={category}
        onCategoryChange={onCategoryChange}
        search={search}
        onSearchChange={setSearch}
      />
      <Ticker />

      <main className="flex-1">
        <Hero
          totalItems={stats.totalItems}
          sourcesOk={stats.sourcesOk}
          sourcesTried={stats.sourcesTried}
        />

        <FeedGrid category={category} search={search} />

        {allData?.items && (
          <TrendingTags items={allData.items} onTagClick={onTagClick} />
        )}

        <FutureVision />

        <Channels />
      </main>

      <Footer />
    </div>
  );
}
