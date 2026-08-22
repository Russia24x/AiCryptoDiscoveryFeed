/**
 * fetch-guard — SSRF protection and body size capping.
 *
 * Used by proxy routes (/api/article, /api/og-image) that fetch arbitrary
 * user-supplied URLs. Prevents requests to internal/private network
 * addresses (loopback, private ranges, link-local, cloud metadata) and
 * caps response body size to prevent memory exhaustion DoS.
 *
 * NOTE: This is application-layer validation. The Cloudflare Workers
 * runtime flag `global_fetch_strictly_public` provides a second layer
 * of protection at the network level — it blocks connections to private
 * IPs even if this function's hostname-based check is bypassed (e.g.
 * via DNS rebinding). Both layers are needed: this function catches
 * obvious attempts early (before wasting a fetch), and the runtime flag
 * catches what hostname string comparison can't (DNS rebinding to private
 * IPs via public domain names like *.localtest.me).
 */

const BLOCKED_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".localdomain",
  ".home.arpa",
];

/**
 * Check if a hostname should be blocked from being fetched.
 * Returns true if the hostname is:
 * - empty
 * - a known internal name (localhost, .local, .internal, etc.)
 * - an IPv4 literal in a private/reserved range (10.x, 127.x, 192.168.x, etc.)
 * - an IPv6 literal in a private/reserved range (fc00::/7, fe80::/10, ::1)
 */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;

  // Check blocked hostname suffixes
  if (
    BLOCKED_SUFFIXES.some((s) => (s.startsWith(".") ? host.endsWith(s) : host === s))
  ) {
    return true;
  }

  // Check IPv4 literal
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return true; // malformed literal
    const [a, b] = o;
    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16/12
    if (a === 192 && b === 168) return true; // private 192.168/16
    return false;
  }

  // Check IPv6 literal (may be wrapped in brackets)
  if (host.includes(":")) {
    const h = host.replace(/^\[/, "").replace(/\]$/, "");
    if (h === "::" || h === "::1") return true; // unspecified, loopback
    if (/^f[cd][0-9a-f]{0,2}:/i.test(h)) return true; // fc00::/7 unique local
    if (/^fe[89ab][0-9a-f]:/i.test(h)) return true; // fe80::/10 link-local
    return false;
  }

  return false;
}

/**
 * Read response body with a size cap.
 * If Content-Length header exceeds cap, throws immediately without reading.
 * Otherwise reads in chunks and throws if total exceeds cap.
 * This prevents memory exhaustion from large/infinite responses.
 */
export async function readBodyCapped(res: Response, maxBytes: number): Promise<string> {
  const lenHeader = res.headers.get("content-length");
  if (lenHeader && parseInt(lenHeader, 10) > maxBytes) {
    throw new Error(`Response too large (${lenHeader} bytes, cap ${maxBytes})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    // Fallback: no stream available, read as text with no cap
    return res.text();
  }

  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (received > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new Error(`Response exceeded ${maxBytes} byte cap`);
    }
  }
  return out + decoder.decode();
}
