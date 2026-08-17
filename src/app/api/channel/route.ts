import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_AGENT =
  "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)";

export interface TelegramPost {
  id: string;
  text: string;
  html: string;
  timestamp?: string;
  datetime?: string;
  views?: string;
  images: string[];
  videos: string[];
  link?: string;
  hasMedia: boolean;
}

/**
 * Fetch the public preview page at https://t.me/s/<handle> and extract
 * the most recent posts. This works without any Telegram API token.
 *
 * Note: only channels that have a public web preview can be scraped.
 * Private channels (no `-100` prefix and no web preview) return an empty
 * list — we just show the link card as a fallback.
 */
function extractPosts(html: string, handle: string): TelegramPost[] {
  const posts: TelegramPost[] = [];

  // Each post is wrapped in <div class="tgme_widget_message_wrap">...<div class="tgme_widget_message"...>...</div></div>
  const postRe =
    /<div[^>]*class=["'][^"']*tgme_widget_message_wrap[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi;

  let m: RegExpExecArray | null;
  while ((m = postRe.exec(html)) !== null && posts.length < 20) {
    const postHtml = m[1];

    // Post ID — look for data-post="channel/12345"
    const idMatch = postHtml.match(/data-post=["']([^"']+)["']/i);
    const id = idMatch ? idMatch[1] : `post-${posts.length}`;

    // Text content — <div class="tgme_widget_message_text">
    const textMatch = postHtml.match(
      /<div[^>]*class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const textHtml = textMatch ? textMatch[1].trim() : "";
    const plainText = textHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Timestamp — <a class="tgme_widget_message_date" title="...">
    const timeMatch = postHtml.match(
      /<a[^>]*class=["'][^"']*tgme_widget_message_date[^"']*["'][^>]*title=["']([^"']+)["']/i
    );
    const timestamp = timeMatch ? timeMatch[1] : undefined;

    const datetimeMatch = postHtml.match(
      /<time[^>]+datetime=["']([^"']+)["']/i
    );
    const datetime = datetimeMatch ? datetimeMatch[1] : undefined;

    // Views — <span class="tgme_widget_message_views">
    const viewsMatch = postHtml.match(
      /<span[^>]*class=["'][^"']*tgme_widget_message_views[^"']*["'][^>]*>([^<]+)<\/span>/i
    );
    const views = viewsMatch ? viewsMatch[1].trim() : undefined;

    // Images — tgme_widget_message_photo wrapping style="background-image:url(...)"
    const images: string[] = [];
    const imgRe = /tgme_widget_message_photo[^>]*style=["'][^"']*background-image:\s*url\(["']?([^"')]+)["']?\)[^"']*["']/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRe.exec(postHtml)) !== null) {
      if (!images.includes(imgMatch[1])) {
        images.push(imgMatch[1]);
      }
    }

    // Videos — tgme_widget_message_video tags
    const videos: string[] = [];
    const vidRe = /<video[^>]+src=["']([^"']+)["']/gi;
    while ((imgMatch = vidRe.exec(postHtml)) !== null) {
      if (!videos.includes(imgMatch[1])) {
        videos.push(imgMatch[1]);
      }
    }

    // Link to this specific post
    const link = `https://t.me/${id.replace("/", "/")}`;

    const hasMedia = images.length > 0 || videos.length > 0;

    // Skip posts that have neither text nor media (e.g., service messages)
    if (!plainText && !hasMedia) continue;

    posts.push({
      id,
      text: plainText.slice(0, 500),
      html: textHtml,
      timestamp,
      datetime,
      views,
      images: images.slice(0, 4),
      videos: videos.slice(0, 1),
      link,
      hasMedia,
    });
  }

  return posts;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle")?.replace(/^@/, "").trim();

  if (!handle) {
    return NextResponse.json(
      { error: "Missing 'handle' query parameter" },
      { status: 400 }
    );
  }

  const previewUrl = `https://t.me/s/${handle}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(previewUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fa,en;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();

    // Detect "channel doesn't have a web preview" page
    if (html.includes("tgme_page_status") && html.includes("PRIVATE")) {
      return NextResponse.json({
        handle,
        previewUrl,
        posts: [],
        isPrivate: true,
        message: "Channel is private or has no web preview",
      });
    }

    const posts = extractPosts(html, handle);

    return NextResponse.json(
      {
        handle,
        previewUrl,
        posts,
        postCount: posts.length,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        handle,
        previewUrl,
        posts: [],
        postCount: 0,
        error: message,
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
