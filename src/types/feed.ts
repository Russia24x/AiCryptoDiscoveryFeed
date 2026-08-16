import type { Category } from "@/lib/sources";

export interface FeedItem {
  id: string;
  title: string;
  titleFa?: string;
  link: string;
  description: string;
  content?: string;
  /** ISO date string */
  pubDate: string;
  image?: string;
  mediaType?: "image" | "video" | "none";
  /** Author / creator if available */
  author?: string;
  /** Source metadata */
  source: {
    id: string;
    name: string;
    nameFa: string;
    category: Exclude<Category, "all">;
    language: "fa" | "en";
    icon?: string;
  };
  /** Tags extracted from description / categories */
  tags?: string[];
}

export interface FeedResponse {
  items: FeedItem[];
  fetchedAt: string;
  /** Total number of sources attempted */
  sourcesTried: number;
  /** Total number of sources that returned at least one item */
  sourcesOk: number;
}
