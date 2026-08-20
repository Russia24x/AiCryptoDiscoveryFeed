/**
 * Safe minimal Markdown → HTML renderer (zero dependencies, ~1KB).
 *
 * Why this exists:
 *   - CMC/CoinGecko coin descriptions arrive as Markdown text.
 *   - Previously we shoved raw Markdown into `dangerouslySetInnerHTML`,
 *     which (a) rendered Markdown as plain text (## was shown literally)
 *     and (b) was an XSS risk if the upstream ever injected HTML.
 *
 * What this does:
 *   - Converts the small subset of Markdown we actually receive from
 *     coin description endpoints (headings, bold, italic, links, lists,
 *     paragraphs, code, blockquotes).
 *   - Strictly escapes HTML *first* — anything that looks like a tag,
 *     attribute, or entity becomes literal text. Markdown is then
 *     applied on top of the escaped string.
 *   - Restricts link hrefs to http(s) only. Any other scheme is
 *     dropped (the link becomes plain text).
 *   - Returns an empty string for empty/null input.
 *
 * What this does NOT do:
 *   - Tables (coin descriptions never contain them; if they did, the
 *     raw pipes would survive as literal text — acceptable degradation).
 *   - Inline HTML (deliberately stripped to text).
 *
 * Implementation note: the renderer is intentionally simple and
 * regex-based. The Markdown we receive is short (typically <2KB) and
 * low-nesting. A real parser would add ~30KB (marked) or ~5KB
 * (micromark). For our use case, the regex approach is sufficient,
 * auditable, and bundle-friendly on Cloudflare Workers free tier.
 */

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

/**
 * Convert a Markdown string to safe HTML.
 * Returns "" for null/undefined/empty input.
 *
 * @param md  Markdown source (may contain inline HTML — will be escaped)
 * @param maxChars  Optional hard cap on input length (default 4000).
 *                  Prevents pathological inputs from blowing up the
 *                  regex engine. Most coin descriptions are <2KB.
 */
export function markdownToHtml(md: string | null | undefined, maxChars = 4000): string {
  if (!md) return "";
  const src = md.slice(0, maxChars);

  // 1. Escape HTML — this kills any <script>, onerror, etc. the
  //    upstream might inject. After this step, the string is plain
  //    text with Markdown syntax still intact.
  const escaped = escapeHtml(src);

  // 2. Split into lines so we can handle block-level syntax
  //    (headings, lists, blockquotes, paragraphs).
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];

  let inUl = false;
  let inOl = false;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length > 0) {
      out.push(`<p>${inlineMd(paraBuf.join(" "))}</p>`);
      paraBuf = [];
    }
  };
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line → paragraph break
    if (trimmed === "") {
      flushPara();
      closeLists();
      continue;
    }

    // Headings: ## h2, ### h3, # h1 (we cap at h3 for design)
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      closeLists();
      const level = Math.min(h[1].length + 1, 4); // h2→h3, etc. (we want small headings)
      const tag = `h${level}`;
      out.push(`<${tag}>${inlineMd(h[2])}</${tag}>`);
      continue;
    }

    // Blockquote: > text
    if (/^>\s?/.test(trimmed)) {
      flushPara();
      closeLists();
      out.push(`<blockquote><p>${inlineMd(trimmed.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }

    // Unordered list: - or * item
    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inlineMd(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    // Ordered list: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${inlineMd(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushPara();
      closeLists();
      out.push("<hr />");
      continue;
    }

    // Otherwise: paragraph text (accumulate until blank line / block change)
    paraBuf.push(trimmed);
  }

  flushPara();
  closeLists();

  return out.join("\n");
}

/**
 * Inline Markdown — applied to text inside paragraphs, list items, etc.
 * Order matters: links first (they may contain brackets), then bold,
 * then italic, then inline code.
 */
function inlineMd(s: string): string {
  let out = s;

  // Inline code: `code` → <code>code</code>
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);

  // Links: [text](href) — http(s) only; other schemes become plain text
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, href) => {
    const safe = /^https?:\/\//i.test(href);
    if (!safe) return text; // drop the link, keep the text
    return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
  });

  // Bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_ (but not inside ** ** which we already handled)
  out = out.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\s][^_]*?)_/g, "$1<em>$2</em>");

  return out;
}

/**
 * Truncate Markdown to a maximum number of paragraphs.
 * Useful for showing only the first N paragraphs of a long coin description.
 *
 * @param md  Markdown source
 * @param maxParagraphs  Maximum number of paragraphs to keep (default 3)
 */
export function truncateMarkdown(md: string, maxParagraphs = 3): string {
  if (!md) return "";
  // Split on double newline (paragraph break) or block-level prefix
  const parts = md.split(/\n\s*\n/);
  const kept = parts.slice(0, maxParagraphs);
  return kept.join("\n\n").trim();
}
