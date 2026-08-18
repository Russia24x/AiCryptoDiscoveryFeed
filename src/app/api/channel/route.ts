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
  /** Original raw HTML from Telegram (for debugging; do not render directly). */
  rawHtml?: string;
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
/**
 * Decode HTML named/decimal/hex entities that Telegram embeds in post HTML.
 * Covers:
 *  - &rlm;       → U+200F  RIGHT-TO-LEFT MARK  (the bug we are fixing)
 *  - &lrm;       → U+200E  LEFT-TO-RIGHT MARK
 *  - &lre;/&rle; → U+202A / U+202B (embedding)
 *  - &lro;/&rro; → U+202C (pop directional)
 *  - &lri;/&rli; → U+202A-U+202E isolate pairs (Unicode 6.3+)
 *  - &fsi;/&pdi; → U+2068 / U+2069 (first-strong isolate)
 *  - &zwj;       → U+200D  ZERO WIDTH JOINER
 *  - &zwnj;      → U+200C  ZERO WIDTH NON-JOINER  (used a lot in Persian)
 *  - &nbsp;      → space
 *  - Numeric: &#1234; / &#x4D2;
 *
 * Returns the decoded string with all known entities replaced by their
 * actual characters. Unknown named entities are left untouched (rare).
 */
function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  // First pass: named entities (Telegram uses a small subset — we cover all
  // of HTML5 common ones to be safe and forward-compatible).
  const NAMED: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    copy: "©",
    reg: "®",
    trade: "™",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lrm: "\u200E",
    rlm: "\u200F",
    lre: "\u202A",
    rle: "\u202B",
    pdf: "\u202C",
    lro: "\u202D",
    rlo: "\u202E",
    lri: "\u2066",
    rli: "\u2067",
    fsi: "\u2068",
    pdi: "\u2069",
    zwj: "\u200D",
    zwnj: "\u200C",
    larr: "←",
    rarr: "→",
    uarr: "↑",
    darr: "↓",
    bull: "•",
    middot: "·",
    sbquo: "‚",
    bdquo: "„",
    ldquo: "“",
    rdquo: "”",
    lsquo: "‘",
    rsquo: "’",
    laquo: "«",
    raquo: "»",
    deg: "°",
    plusmn: "±",
    times: "×",
    divide: "÷",
    ne: "≠",
    le: "≤",
    ge: "≥",
    infin: "∞",
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    euro: "€",
    pound: "£",
    yen: "¥",
    cent: "¢",
    sect: "§",
    para: "¶",
    permil: "‰",
    prime: "′",
    Prime: "″",
    oline: "‾",
    frasl: "⁄",
    not: "¬",
    shy: "\u00AD",
    ensp: "\u2002",
    emsp: "\u2003",
    thinsp: "\u2009",
    ndash2: "–",
  };
  let out = input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
    if (body.startsWith("#")) {
      // Numeric: &#1234; or &#x4D2;
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isNaN(code) && code >= 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return m;
        }
      }
      return m;
    }
    return NAMED[body] ?? m;
  });
  return out;
}

/**
 * Convert raw Telegram post HTML into clean plain text.
 *
 * This does THREE passes:
 *  1. Decode HTML entities FIRST (so &rlm; becomes U+200F and gets stripped
 *     together with any raw RTL/LTR marks Telegram also sends as raw chars).
 *  2. Strip tags but preserve line breaks from <br>, </p>, </div>.
 *  3. Normalize whitespace and remove all bidi control chars that should
 *     never be visible to the user (RLM, LRM, LRE, RLE, LRO, RLO, PDF, LRI,
 *     RLI, FSI, PDI, ZWJ, ZWNJ). Zero-width chars are dropped entirely.
 */
function htmlToPlainText(html: string): string {
  if (!html) return "";
  // 1. Decode entities first
  let out = decodeHtmlEntities(html);
  // 2. Replace structural tags with newlines BEFORE stripping tags
  out = out
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  // 3. Strip all remaining tags
  out = out.replace(/<[^>]+>/g, "");
  // 4. Collapse 3+ newlines to 2, trim each line
  out = out
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === "" && (i === 0 || i === arr.length - 1)))
    .join("\n");
  // 5. Strip all invisible bidi-control chars (now that entities are decoded,
  //    any U+200F / U+200E / etc. came from &rlm; / &lrm; and should be removed
  //    — they were only there for visual RTL formatting of mixed-direction text,
  //    but in plain-text preview they show as garbage in some terminals/browsers).
  out = out.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/g, "");
  // 6. Final cleanup: collapse double spaces, trim
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Sanitize raw Telegram post HTML for SAFE display with `dangerouslySetInnerHTML`.
 *
 * This is more permissive than `htmlToPlainText`: it keeps the markup so the
 * post renders with proper formatting (bold, links, line breaks), but it:
 *  - Decodes entities (so &rlm; becomes a real U+200F char inside the HTML).
 *  - Strips <script>, <style>, on*= handlers, javascript: URLs.
 *  - Strips class attributes (we don't want Telegram's classes to style our page).
 *  - Keeps <a href>, <b>, <i>, <strong>, <em>, <br>, <p>, <span> only.
 *
 * The decoded RTL/LRM marks are INTENTIONALLY kept here because they help
 * the browser render mixed-direction text correctly (e.g. an English
 * cryptocurrency name inside a Persian sentence). They are invisible.
 */
function sanitizePostHtml(html: string): string {
  if (!html) return "";
  // 1. Decode entities so &rlm; → U+200F etc.
  let out = decodeHtmlEntities(html);
  // 2. Drop dangerous tags entirely
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<object[\s\S]*?<\/object>/gi, "");
  out = out.replace(/<embed[\s\S]*?<\/embed>/gi, "");
  // 3. Strip class=, style=, id=, data-* attributes (we don't trust them)
  out = out.replace(/\s+(class|style|id|on\w+|data-[a-z\-]+)\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+(class|style|id|on\w+|data-[a-z\-]+)\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\s+(class|style|id|on\w+|data-[a-z\-]+)\s*=\s*[^\s>]+/gi, "");
  // 4. Sanitize href: only allow http(s), mailto, tel
  out = out.replace(/<a\s+([^>]*)>/gi, (full, attrs) => {
    const href = attrs.match(/href\s*=\s*"([^"]+)"/i)?.[1] ||
                 attrs.match(/href\s*=\s*'([^']+)'/i)?.[1] ||
                 attrs.match(/href\s*=\s*([^\s>]+)/i)?.[1];
    if (!href) return "";
    const safe = /^(https?:|mailto:|tel:)/i.test(href);
    if (!safe) return "";
    const target = attrs.match(/target\s*=\s*"[^"]+"/i)?.[0] || "";
    return `<a href="${href}" ${target} rel="noopener noreferrer nofollow">`;
  });
  // 5. Allow only a small set of inline tags (drop tg-emoji, tgme_widget_*
  //    wrappers, etc.)
  out = out.replace(/<\/?(tg-emoji|tgme_widget_message_[a-z_]+|span)[^>]*>/gi, "");
  // 6. Keep <br>, <p>, <b>, <i>, <strong>, <em>, <a>, <s>, <u>, <code>
  //    Strip anything else.
  out = out.replace(/<\/?(?!\/?(?:a|b|i|strong|em|br|p|s|u|code)\b)[a-z][a-z0-9]*[^>]*>/gi, "");
  return out.trim();
}

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
    // Telegram supports two variants:
    //   - text (no dir)        — most older posts
    //   - js-message_text      — newer posts with directional isolates
    // Match either. We also accept the optional dir="auto" attribute.
    const textMatch = postHtml.match(
      /<div[^>]*class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const rawTextHtml = textMatch ? textMatch[1].trim() : "";
    // Build BOTH a clean plain-text preview AND a sanitized HTML string
    // for rich rendering. The plain text strips ALL bidi control chars
    // (RLM, LRM, etc.) because those should never be visible to the user.
    // The sanitized HTML keeps the formatting tags (<b>, <i>, <br>, <a>)
    // and keeps the decoded bidi marks (invisible, needed for proper
    // mixed-direction rendering).
    const plainText = htmlToPlainText(rawTextHtml);
    const sanitizedHtml = sanitizePostHtml(rawTextHtml);

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
      html: sanitizedHtml,
      rawHtml: rawTextHtml,
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
