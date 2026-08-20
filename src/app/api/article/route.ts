import { NextResponse } from "next/server";

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
 * Find the matching closing tag for an opening tag at `startIdx`.
 *
 * This is a simple depth-counting parser — NOT a full HTML parser. It
 * walks forward from the opening tag and counts `<tag ...>` vs `</tag>`
 * occurrences, returning the index AFTER the matching close.
 *
 * Why we need this: regex-based extraction like
 *   /<div class="articleContent">([\s\S]*?)<\/div>\s*(?:<div|...)/
 * stops at the FIRST `</div>`, which is wrong when the content div
 * has nested divs inside it. Vigiato.net's articleContent div is
 * 33,765 chars but contains ~30 nested divs, so the regex only
 * captures 3,854 chars — most of the article is lost.
 *
 * `tag` should be lowercase, e.g. "div", "article", "main", "section".
 */
function findMatchingCloseTag(
  html: string,
  startIdx: number,
  tag: string
): number {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  const closeRe = new RegExp(`</${tag}>`, "gi");
  // Both regexes MUST start searching from startIdx — otherwise the close
  // regex will find an earlier </div> from before our opening tag, making
  // depth go negative and returning a wrong (too-early) close position.
  openRe.lastIndex = startIdx;
  closeRe.lastIndex = startIdx;
  let depth = 1;
  let pos = startIdx;
  const max = Math.min(html.length, startIdx + 200_000); // hard cap
  while (depth > 0 && pos < max) {
    const openMatch = openRe.exec(html);
    const closeMatch = closeRe.exec(html);
    if (!closeMatch) break;
    if (openMatch && openMatch.index < closeMatch.index) {
      depth++;
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth--;
      pos = closeMatch.index + closeMatch[0].length;
      if (depth === 0) {
        return pos;
      }
    }
  }
  return -1; // no match found
}

/**
 * Try a series of strategies to extract the article body.
 *
 * Strategy priority (most reliable first):
 *   1. Nesting-aware div extraction by content class — handles sites
 *      like vigiato.net whose articleContent div has nested divs.
 *      The old regex `/<div class="articleContent">([\s\S]*?)<\/div>.../`
 *      stopped at the FIRST `</div>`, capturing only 3.8KB of a 33KB
 *      article. We now use a proper depth-counting parser.
 *   2. <article> tag — but only if it contains substantial content (>1500 chars).
 *   3. <main> tag.
 *   4. Paragraph fallback — collect <p> tags from <body> (used only as last resort).
 */
function extractArticleHtml(html: string): { html: string; strategy: string } {
  // Strategy 1: nesting-aware div extraction by content class.
  // For each pattern, find the opening tag, then find its matching close
  // using depth counting (handles nested divs correctly).
  const contentClassPatterns: RegExp[] = [
    // WordPress + standard patterns (highest priority)
    /<div[^>]*class=["'][^"']*(?:entry-content|post-content|article-content|content-body|article__body|post__content|post-body|content__article|story-body|article-body|rich-text|markdown-body|td-post-content|single-content)[^"']*["'][^>]*>/i,
    // Vigiato-specific
    /<div[^>]*class=["'][^"']*articleContent[^"']*["'][^>]*>/i,
    // Arzdigital-specific
    /<div[^>]*class=["'][^"']*(?:post__content|article__body)[^"']*["'][^>]*>/i,
    // Mihanblockchain + generic WordPress
    /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>/i,
  ];

  let bestContent = "";
  let bestStrategy = "";
  for (const re of contentClassPatterns) {
    const openMatch = re.exec(html);
    if (!openMatch) continue;
    const openTagEnd = openMatch.index + openMatch[0].length;
    const closeEnd = findMatchingCloseTag(html, openTagEnd, "div");
    if (closeEnd === -1) continue;
    const content = html.slice(openTagEnd, closeEnd - `</div>`.length);
    // Track the longest match — sometimes multiple patterns match the
    // same div, sometimes different divs. Longest = most content.
    if (content.length > bestContent.length) {
      bestContent = content;
      bestStrategy = "content-class";
    }
  }
  if (bestContent.length > 800) {
    return { html: bestContent, strategy: bestStrategy };
  }

  // Strategy 2: <article> tag — also nesting-aware (articles can nest)
  const articleOpenRe = /<article\b[^>]*>/gi;
  let bestArticle = "";
  let am: RegExpExecArray | null;
  while ((am = articleOpenRe.exec(html)) !== null) {
    const openEnd = am.index + am[0].length;
    const closeEnd = findMatchingCloseTag(html, openEnd, "article");
    if (closeEnd === -1) continue;
    const content = html.slice(openEnd, closeEnd - `</article>`.length);
    if (content.length > bestArticle.length) {
      bestArticle = content;
    }
  }
  if (bestArticle.length > 1500) {
    return { html: bestArticle, strategy: "article" };
  }

  // Strategy 3: <main> tag — nesting-aware
  const mainOpen = html.match(/<main\b[^>]*>/i);
  if (mainOpen && mainOpen.index !== undefined) {
    const openEnd = mainOpen.index + mainOpen[0].length;
    const closeEnd = findMatchingCloseTag(html, openEnd, "main");
    if (closeEnd !== -1) {
      const content = html.slice(openEnd, closeEnd - `</main>`.length);
      if (content.length > 1500) {
        return { html: content, strategy: "main" };
      }
    }
  }

  // Strategy 4: Paragraph fallback — collect <p> tags with >80 chars.
  // ONLY use this as last resort. We deliberately DON'T include paragraphs
  // that contain nav/footer keywords, to avoid showing "the main page"
  // when article extraction fails (which was a user-reported issue).
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const body = bodyMatch[1];
    const paragraphs: string[] = [];
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = pRe.exec(body)) !== null) {
      const p = m[1].trim();
      // Skip navigation/footer paragraphs (usually short)
      if (p.length > 80 && !/cookie|newsletter|subscribe|copyright|all rights reserved|پیشنهاد مطالعه|مطالب مرتبط|نظرات شما/i.test(p)) {
        paragraphs.push(`<p>${p}</p>`);
      }
    }
    // Require at least 5 substantial paragraphs — this prevents grabbing
    // 3 random nav paragraphs and calling it an article.
    if (paragraphs.length >= 5) {
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
      // For <a> tags, only keep href — and reject dangerous schemes
      // (javascript:, data:, vbscript:, file:). These can execute when
      // the user clicks the link, so we drop the href entirely and
      // leave a plain anchor with no navigation.
      if (tag.toLowerCase() === "a") {
        const hrefMatch = full.match(/href=["']([^"']*)["']/i);
        const targetAttr = ' target="_blank" rel="noopener noreferrer nofollow"';
        if (hrefMatch) {
          const href = hrefMatch[1].trim();
          // Reject anything that isn't http(s) or a relative URL.
          // Most valid article links are absolute https.
          if (/^https?:\/\//i.test(href) || /^\//.test(href) || /^#/i.test(href) || /^mailto:/i.test(href)) {
            return `<a href="${href}"${targetAttr}>`;
          }
          // Dangerous or weird scheme (javascript:, data:, vbscript:, etc.)
          return "<a>";
        }
        return "<a>";
      }
      // For <img>, only keep src + alt + loading
      if (tag.toLowerCase() === "img") {
        const srcMatch = full.match(/src=["']([^"']*)["']/i);
        const altMatch = full.match(/alt=["']([^"']*)["']/i);
        if (srcMatch) {
          const src = srcMatch[1].trim();
          // Only allow http(s) and protocol-relative (//example.com) URLs.
          // data: URLs in <img> can be huge SVGs that leak state, so we
          // reject them too. Relative URLs would 404 against our domain.
          if (/^https?:\/\//i.test(src) || /^\/\//.test(src)) {
            const alt = altMatch ? altMatch[1] : "";
            return `<img src="${src}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" />`;
          }
          return "";
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

  // og:description / meta description — used as fallback when body extraction fails
  const ogDescription =
    get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);

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

  return { ogTitle, ogImage, author, publishedDate, siteName, favicon, ogDescription };
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

    // If we have og:image but no images in body, add it as the first image
    if (meta.ogImage && !extractedImages.includes(meta.ogImage)) {
      extractedImages.unshift(meta.ogImage);
      // Also inject the og:image as the lead image in the HTML body if it's empty
      if (!cleanedHtml) {
        cleanedHtml = `<p><img src="${meta.ogImage}" alt="${meta.ogTitle || ""}" /></p>`;
      }
    }

    // FALLBACK: If article body extraction failed, use og:description as the body
    if ((!cleanedHtml || cleanedHtml.length < 200) && meta.ogDescription) {
      cleanedHtml = `<p>${meta.ogDescription}</p>`;
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
