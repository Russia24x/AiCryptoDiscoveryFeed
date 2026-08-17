import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_AGENT =
  "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)";

interface OGImageResponse {
  url?: string;
  source: "og:image" | "twitter:image" | "image_src" | "first-img" | "none";
  sourceUrl: string;
  fetchedAt: string;
}

/**
 * Lightweight endpoint that returns ONLY the article's social/cover image.
 * Used by the FeedCard to lazily fetch the article's image when the RSS
 * feed doesn't include one (very common for Persian sources).
 *
 * Tries in order:
 *   1. <meta property="og:image">
 *   2. <meta name="twitter:image">
 *   3. <link rel="image_src">
 *   4. First <img> tag in <body> that looks like a hero image
 *
 * Heavily cached at the edge (1 hour) so we don't hammer source sites.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleUrl = searchParams.get("url");

  if (!articleUrl) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(articleUrl);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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

    const html = await res.text();
    const headHtml = html.slice(0, 200000);

    const cacheHeaders = {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    };

    // 1. og:image
    const ogMatch = headHtml.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (ogMatch && ogMatch[1]) {
      return NextResponse.json(
        {
          url: ogMatch[1],
          source: "og:image",
          sourceUrl: articleUrl,
          fetchedAt: new Date().toISOString(),
        } as OGImageResponse,
        { headers: cacheHeaders }
      );
    }

    // 2. twitter:image
    const twMatch = headHtml.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (twMatch && twMatch[1]) {
      return NextResponse.json(
        {
          url: twMatch[1],
          source: "twitter:image",
          sourceUrl: articleUrl,
          fetchedAt: new Date().toISOString(),
        } as OGImageResponse,
        { headers: cacheHeaders }
      );
    }

    // 3. link rel="image_src"
    const linkMatch = headHtml.match(
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i
    );
    if (linkMatch && linkMatch[1]) {
      return NextResponse.json(
        {
          url: linkMatch[1],
          source: "image_src",
          sourceUrl: articleUrl,
          fetchedAt: new Date().toISOString(),
        } as OGImageResponse,
        { headers: cacheHeaders }
      );
    }

    // 4. First <img> in body that looks like content (filter out tiny icons / tracking pixels)
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const body = bodyMatch[1];
      const imgs: { src: string; width: number; height: number }[] = [];
      const re = /<img\b([^>]+)>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const attrs = m[1];
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const wMatch = attrs.match(/width=["'](\d+)["']/i);
        const hMatch = attrs.match(/height=["'](\d+)["']/i);
        if (srcMatch) {
          const w = wMatch ? parseInt(wMatch[1], 10) : 0;
          const h = hMatch ? parseInt(hMatch[1], 10) : 0;
          // Skip tiny images (icons, trackers, ad pixels)
          if (w > 0 && h > 0 && (w < 200 || h < 150)) continue;
          // Skip data: URIs
          if (srcMatch[1].startsWith("data:")) continue;
          imgs.push({ src: srcMatch[1], width: w, height: h });
        }
      }
      if (imgs.length > 0) {
        // Prefer images without explicit size (likely hero images) or first one
        const hero =
          imgs.find((i) => i.width === 0 || i.height === 0) || imgs[0];
        return NextResponse.json(
          {
            url: hero.src,
            source: "first-img",
            sourceUrl: articleUrl,
            fetchedAt: new Date().toISOString(),
          } as OGImageResponse,
          { headers: cacheHeaders }
        );
      }
    }

    // No image found
    return NextResponse.json(
      {
        url: undefined,
        source: "none",
        sourceUrl: articleUrl,
        fetchedAt: new Date().toISOString(),
      } as OGImageResponse,
      { headers: cacheHeaders }
    );
  } catch {
    return NextResponse.json(
      {
        url: undefined,
        source: "none",
        sourceUrl: articleUrl,
        fetchedAt: new Date().toISOString(),
      } as OGImageResponse,
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}
