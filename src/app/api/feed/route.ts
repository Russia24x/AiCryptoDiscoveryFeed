import { NextResponse } from "next/server";
import { SOURCES } from "@/lib/sources";
import type { FeedItem, FeedResponse } from "@/types/feed";
import type { Category } from "@/lib/sources";

export const runtime = "nodejs";
export const revalidate = 0; // always fresh — per-query response
export const dynamic = "force-dynamic";

interface ParsedItem {
  title: string;
  link: string;
  description: string;
  content?: string;
  pubDate: string;
  image?: string;
  author?: string;
  tags?: string[];
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)";

/** Decode HTML entities & strip tags for a quick text preview. */
function stripHtml(input: string): string {
  if (!input) return "";
  let out = input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

/** Try a few common paths to extract a primary image from a feed item. */
function extractImage(itemXml: string, content: string): string | undefined {
  const mediaMatch =
    itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
    itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch) return mediaMatch[1];

  const imgTag = itemXml.match(/<image><url>([^<]+)<\/url>/i);
  if (imgTag) return imgTag[1];

  const htmlImg = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImg) return htmlImg[1];

  return undefined;
}

function extractAuthor(itemXml: string): string | undefined {
  const m =
    itemXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i) ||
    itemXml.match(/<author[^>]*><name>([^<]+)<\/name>/i) ||
    itemXml.match(/<author>([^<]+)<\/author>/i);
  return m ? m[1].trim() : undefined;
}

function extractTags(itemXml: string): string[] {
  const tags: string[] = [];
  const re = /<(category|dc:subject)[^>]*>([^<]+)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(itemXml)) !== null) {
    const t = m[2].trim();
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags.slice(0, 5);
}

/** Lightweight regex-based RSS / Atom parser (no external dep). */
function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const entryRe = /<entry\b[\s\S]*?<\/entry>/gi;

  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const itemReLocal = new RegExp(itemRe.source, "gi");
  while ((m = itemReLocal.exec(xml)) !== null) matches.push(m[0]);
  const entryReLocal = new RegExp(entryRe.source, "gi");
  while ((m = entryReLocal.exec(xml)) !== null) matches.push(m[0]);

  for (const raw of matches.slice(0, 15)) {
    const title =
      raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
    const link =
      raw.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ||
      raw.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1]?.trim() ||
      "";
    const description =
      raw.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.trim() ||
      raw.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.trim() ||
      "";
    const content =
      raw.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1]?.trim() ||
      raw.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1]?.trim() ||
      "";
    const pubDate =
      raw.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1]?.trim() ||
      raw.match(/<published[^>]*>([^<]+)<\/published>/i)?.[1]?.trim() ||
      raw.match(/<updated[^>]*>([^<]+)<\/updated>/i)?.[1]?.trim() ||
      "";

    const image = extractImage(raw, content || description);
    const author = extractAuthor(raw);
    const tags = extractTags(raw);

    if (!title && !link) continue;
    items.push({
      title: stripHtml(title),
      link,
      description: stripHtml(description).slice(0, 280),
      content: content || description,
      pubDate: pubDate || new Date().toISOString(),
      image,
      author,
      tags,
    });
  }

  return items;
}

async function fetchFeed(source: (typeof SOURCES)[number]): Promise<ParsedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(source.feed, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: controller.signal,
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const xml = await res.text();
    return parseFeed(xml);
  } finally {
    clearTimeout(timeout);
  }
}

/** Try to detect if a string is mostly Persian / Arabic characters. */
function isPersian(s: string): boolean {
  const persian = (s.match(/[\u0600-\u06FF]/g) || []).length;
  return persian > s.length * 0.25;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") || "all") as Category;
  const limit = Math.min(parseInt(searchParams.get("limit") || "60", 10), 200);
  const search = (searchParams.get("q") || "").trim().toLowerCase();
  const sourceFilter = (searchParams.get("source") || "").trim().toLowerCase();

  let sources =
    category === "all" ? SOURCES : SOURCES.filter((s) => s.category === category);

  // If a specific source filter is provided, narrow to that single source.
  if (sourceFilter) {
    sources = sources.filter((s) => s.id === sourceFilter);
  }

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const items = await fetchFeed(src);
      return { src, items };
    })
  );

  const allItems: FeedItem[] = [];
  let sourcesOk = 0;

  // Track canonical keys (normalized title + URL hostname+pathname) to dedupe
  // articles that appear in multiple feeds (e.g., TechCrunch + TechCrunch AI).
  const seenKeys = new Set<string>();
  const dedupeKey = (title: string, link: string): string => {
    const t = (title || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    let host = "";
    let path = "";
    try {
      const u = new URL(link);
      host = u.hostname.replace(/^www\./, "");
      path = u.pathname.replace(/\/+$/g, "").toLowerCase();
    } catch {
      // ignore — fall back to title-only key
    }
    return host ? `${host}|${path}|${t}` : `title|${t}`;
  };

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { src, items } = r.value;
    if (!items.length) continue;
    sourcesOk++;
    for (const it of items) {
      // Skip items missing both link AND title
      if (!it.title && !it.link) continue;

      const key = dedupeKey(it.title, it.link);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const id = `${src.id}:${it.link || it.title}`.slice(0, 200);
      allItems.push({
        id,
        title: it.title,
        link: it.link,
        description: it.description,
        content: it.content,
        pubDate: it.pubDate,
        image: it.image,
        mediaType: it.image ? "image" : "none",
        author: it.author,
        source: {
          id: src.id,
          name: src.name,
          nameFa: src.nameFa,
          category: src.category,
          language: src.language,
          icon: src.icon,
        },
        tags: it.tags,
      });
    }
  }

  allItems.sort((a, b) => {
    const da = new Date(a.pubDate).getTime() || 0;
    const db = new Date(b.pubDate).getTime() || 0;
    return db - da;
  });

  let filtered = allItems;
  if (search) {
    filtered = allItems.filter(
      (it) =>
        it.title.toLowerCase().includes(search) ||
        it.description.toLowerCase().includes(search) ||
        (it.tags || []).some((t) => t.toLowerCase().includes(search))
    );
  }

  const finalItems = filtered.slice(0, limit).map((it) => ({
    ...it,
    titleFa: isPersian(it.title) ? it.title : undefined,
  }));

  const body: FeedResponse = {
    items: finalItems,
    fetchedAt: new Date().toISOString(),
    sourcesTried: sources.length,
    sourcesOk,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
