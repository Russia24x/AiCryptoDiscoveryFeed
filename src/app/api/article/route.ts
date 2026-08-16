import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_AGENT =
  "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)";

interface ExtractedArticle {
  title: string;
  html: string;
  text: string;
  excerpt: string;
  images: string[];
  author?: string;
  publishedDate?: string;
  siteName?: string;
  favicon?: string;
  wordCount: number;
  readingTimeMinutes: number;
  fetchError?: string;
}

/** Strip HTML tags + entities → plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode HTML entities for plain-text fields like title. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Try a series of CSS-selector strategies to extract the article body.
 * Most news sites use one of these common patterns.
 */
function extractArticleHtml(html: string): { html: string; strategy: string } {
  // Strategy 1: <article> tag (most modern sites)
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && articleMatch[1].length > 1500) {
    return { html: articleMatch[1], strategy: "article" };
  }

  // Strategy 2: common content class patterns
  const contentPatterns = [
    /<div[^>]*class=["'][^"']*(?:entry-content|post-content|article-content|content-body|article__body|post__content|post-body|content__article|story-body|article-body|rich-text|markdown-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div|<footer|<section|<\/main)/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const re of contentPatterns) {
    const m = html.match(re);
    if (m && m[1].length > 1500) {
      return { html: m[1], strategy: "content-class" };
    }
  }

  // Strategy 3: WordPress /oembed fallback — get all <p> tags within <body>
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const body = bodyMatch[1];
    const paragraphs: string[] = [];
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = pRe.exec(body)) !== null) {
      const p = m[1].trim();
      // Skip navigation/footer paragraphs (usually short)
      if (p.length > 80 && !/cookie|newsletter|subscribe|copyright/i.test(p)) {
        paragraphs.push(`<p>${p}</p>`);
      }
    }
    if (paragraphs.length >= 3) {
      return {
        html: paragraphs.join("\n"),
        strategy: "paragraphs",
      };
    }
  }

  return { html: "", strategy: "none" };
}

/** Clean extracted HTML: remove scripts, styles, nav, ads; keep <p>, <img>, <h2-h4>, <ul>, <ol>, <blockquote>, <a>, <figure>. */
function cleanArticleHtml(html: string): string {
  let out = html;

  // Remove unwanted tags completely
  out = out
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Remove class/style/id attributes (we'll style ourselves)
  out = out.replace(/\s(class|style|id|onclick|onload|onerror|data-[a-z-]+)=["'][^"']*["']/gi, "");

  // Whitelist of tags we keep. Anything else becomes its text content.
  const allowed = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "img", "figure", "figcaption",
    "blockquote", "pre", "code",
    "br", "hr", "em", "strong", "b", "i", "u", "s",
    "table", "thead", "tbody", "tr", "th", "td",
  ]);

  // Replace disallowed tags with their inner text
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (full, tag) => {
    if (allowed.has(tag.toLowerCase())) {
      // For <a> tags, only keep href
      if (tag.toLowerCase() === "a") {
        const hrefMatch = full.match(/href=["']([^"']*)["']/i);
        const targetAttr = ' target="_blank" rel="noopener noreferrer nofollow"';
        if (hrefMatch) {
          return `<a href="${hrefMatch[1]}"${targetAttr}>`;
        }
        return "<a>";
      }
      // For <img>, only keep src + alt + loading
      if (tag.toLowerCase() === "img") {
        const srcMatch = full.match(/src=["']([^"']*)["']/i);
        const altMatch = full.match(/alt=["']([^"']*)["']/i);
        if (srcMatch) {
          const alt = altMatch ? altMatch[1] : "";
          return `<img src="${srcMatch[1]}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" />`;
        }
        return "";
      }
      // For other allowed tags, return the tag name only (stripped of attrs)
      const isClosing = full.startsWith("</");
      return isClosing ? `</${tag.toLowerCase()}>` : `<${tag.toLowerCase()}>`;
    }
    // For disallowed tags, return their inner text only (which is already in the string).
    // Returning empty string effectively strips the tag.
    return "";
  });

  // Collapse multiple blank lines
  out = out.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

  return out;
}

/** Extract all image URLs from cleaned HTML (we'll show them as a gallery). */
function extractImages(html: string): string[] {
  const images: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    // Filter out tiny icons / logos / data: URIs
    if (src && !src.startsWith("data:") && !images.includes(src)) {
      images.push(src);
    }
  }
  return images.slice(0, 20);
}

/** Try to extract metadata from <head>: og:title, og:image, author, published_time. */
function extractMeta(html: string, sourceUrl: string) {
  const get = (re: RegExp): string | undefined => {
    const m = html.match(re);
    return m ? decodeEntities(m[1]) : undefined;
  };

  const ogTitle =
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<title[^>]*>([^<]+)<\/title>/i);

  const ogImage =
    get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  const author =
    get(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i);

  const publishedDate =
    get(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<time[^>]+datetime=["']([^"']+)["']/i);

  const siteName =
    get(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);

  let favicon: string | undefined;
  const faviconMatch =
    html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);
  if (faviconMatch) {
    try {
      favicon = new URL(faviconMatch[1], sourceUrl).href;
    } catch {
      // ignore
    }
  }

  return { ogTitle, ogImage, author, publishedDate, siteName, favicon };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleUrl = searchParams.get("url");

  if (!articleUrl) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 }
    );
  }

  // Validate URL — must be http/https
  let parsed: URL;
  try {
    parsed = new URL(articleUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(articleUrl, {
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

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }

    const html = await res.text();

    const meta = extractMeta(html, articleUrl);
    const { html: rawBody, strategy } = extractArticleHtml(html);

    let cleanedHtml = "";
    let extractedImages: string[] = [];

    if (rawBody) {
      cleanedHtml = cleanArticleHtml(rawBody);
      extractedImages = extractImages(cleanedHtml);
    }

    // If we have og:image but no images in body, add it
    if (meta.ogImage && !extractedImages.includes(meta.ogImage)) {
      extractedImages.unshift(meta.ogImage);
    }

    const plainText = cleanedHtml ? htmlToText(cleanedHtml) : "";
    const wordCount = plainText
      ? plainText.split(/\s+/).filter(Boolean).length
      : 0;
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 220));

    const excerpt = plainText.slice(0, 280).trim();

    const result: ExtractedArticle = {
      title: meta.ogTitle || "",
      html: cleanedHtml,
      text: plainText,
      excerpt,
      images: extractedImages.slice(0, 10),
      author: meta.author,
      publishedDate: meta.publishedDate,
      siteName: meta.siteName,
      favicon: meta.favicon,
      wordCount,
      readingTimeMinutes,
    };

    return NextResponse.json(
      { ...result, strategy, sourceUrl: articleUrl, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch article",
        message,
        sourceUrl: articleUrl,
      },
      { status: 200 } // 200 so client can show fallback UI
    );
  } finally {
    clearTimeout(timeout);
  }
}
