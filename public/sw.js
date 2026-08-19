/**
 * Service Worker for Ai Crypto Discovery — v2.0
 *
 * Modern offline-first service worker with:
 *  1. Smart app-shell pre-caching (key routes, not just "/")
 *  2. Per-route navigation caching (each page cached individually)
 *  3. Stale-while-revalidate for static assets (JS/CSS/fonts/images)
 *  4. Network-first with cache fallback for API routes
 *  5. Cache size limit (LRU eviction) to prevent unbounded growth
 *  6. Better error pages with retry support
 *  7. Update notification via postMessage
 *
 * Strategy reference:
 *  - Network-first: try network, fall back to cache (best for fresh data)
 *  - Stale-while-revalidate: serve cache immediately, revalidate in background
 *  - Cache-first: serve cache, only hit network if cache misses
 *
 * Version: 2.0.0 — bumped on every release to trigger SW update.
 */

const VERSION = "v2.0.0-opennext";
const STATIC_CACHE = `acd-static-${VERSION}`;
const PAGE_CACHE = `acd-pages-${VERSION}`;
const API_CACHE = `acd-api-${VERSION}`;
const IMAGE_CACHE = `acd-images-${VERSION}`;

// Max number of items to keep in each cache (LRU eviction).
// Static cache is exempt (it's small and known).
const API_CACHE_MAX = 50;
const PAGE_CACHE_MAX = 20;
const IMAGE_CACHE_MAX = 100;

// Files that make up the "app shell" — without these, the page can't
// render at all. Pre-cached on install so the app works offline from
// first load.
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/robots.txt",
];

// Key navigation routes that should be cached on first visit.
// These get network-first treatment, but if the user has visited them
// before, they'll work offline.
const KEY_ROUTES = [
  "/",
  "/crypto",
  "/ai",
  "/tech",
  "/gaming",
  "/entertainment",
  "/crypto/market",
];

// === INSTALL: pre-cache the app shell ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Add each file individually so a 404 on one doesn't abort the rest.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) {
              await cache.put(url, res.clone());
            }
          } catch {
            // ignore — will be cached on first navigation
          }
        })
      );
      // Force the new SW to activate immediately (skip waiting phase)
      await self.skipWaiting();
    })()
  );
});

// === ACTIVATE: clean up old caches and claim clients ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          // Delete any cache that doesn't match our current version prefix.
          // We use a prefix check so we don't accidentally delete other apps'
          // caches (though service workers are scoped per origin).
          if (
            key.startsWith("acd-") &&
            ![STATIC_CACHE, PAGE_CACHE, API_CACHE, IMAGE_CACHE].includes(key)
          ) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      // Take control of all clients immediately (so the new SW is active
      // on the current page, not just new navigations).
      await self.clients.claim();
    })()
  );
});

// === Helper: trim a cache to its max size (LRU eviction by last access) ===
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  // Cache Storage API doesn't expose access times directly, but `keys()`
  // returns items in insertion order (oldest first). Delete from the front.
  const toDelete = keys.slice(0, keys.length - maxItems);
  await Promise.all(toDelete.map((req) => cache.delete(req)));
}

// === Helper: is this a navigation request? ===
function isNavigationRequest(req) {
  return req.mode === "navigate";
}

// === Helper: is this an API request? ===
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// === Helper: is this a static asset? ===
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    [".js", ".css", ".woff", ".woff2", ".ttf", ".png", ".jpg", ".jpeg",
     ".gif", ".svg", ".webp", ".ico", ".json"].some((ext) =>
      url.pathname.endsWith(ext)
    )
  );
}

// === Helper: is this an image request? ===
function isImageRequest(url) {
  const isImg = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].some((ext) =>
    url.pathname.endsWith(ext)
  );
  return isImg && !url.pathname.startsWith("/_next/static/media/");
}

// === FETCH: routing strategy ===
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only intercept GET requests.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don't intercept cross-origin requests (e.g., Google Fonts, RSS feeds).
  if (url.origin !== self.location.origin) return;

  // Don't intercept Next.js HMR / dev-only requests (defensive).
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // === API requests: network-first, fall back to cache ===
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(req));
    return;
  }

  // === Navigation requests: network-first with per-route caching ===
  if (isNavigationRequest(req)) {
    event.respondWith(handleNavigationRequest(req));
    return;
  }

  // === Static assets: stale-while-revalidate ===
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(req));
    return;
  }

  // === Images: cache-first with size limit ===
  if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(req));
    return;
  }

  // === Default: try cache, fall back to network ===
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      return (
        cached ||
        (await fetch(req).catch(() => new Response("", { status: 504 })))
      );
    })()
  );
});

// === Navigation handler: network-first, fall back to cached page ===
async function handleNavigationRequest(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const networkRes = await fetch(req);
    if (networkRes && networkRes.ok) {
      // Cache the latest HTML for offline use.
      cache.put(req, networkRes.clone()).catch(() => {});
      // Trim cache in the background to avoid unbounded growth.
      trimCache(PAGE_CACHE, PAGE_CACHE_MAX);
    }
    return networkRes;
  } catch {
    // Network failed — try the exact cached request first.
    const cached = await cache.match(req);
    if (cached) return cached;
    // Fall back to "/" if we're on a key route (e.g., /crypto when offline
    // → serve the cached home page so the app shell renders).
    const url = new URL(req.url);
    if (KEY_ROUTES.includes(url.pathname)) {
      const homeCached = await cache.match("/");
      if (homeCached) return homeCached;
    }
    // Final fallback — friendly offline page.
    return getOfflinePage();
  }
}

// === API handler: network-first, fall back to cache ===
async function handleApiRequest(req) {
  const cache = await caches.open(API_CACHE);
  try {
    const networkRes = await fetch(req);
    if (networkRes && networkRes.ok) {
      // Cache a copy for offline use. Limit to responses under 1MB
      // to prevent cache bloat from large feed responses.
      const clone = networkRes.clone();
      const text = await clone.text();
      if (text.length < 1024 * 1024) {
        await cache.put(req, networkRes.clone());
        trimCache(API_CACHE, API_CACHE_MAX);
      }
    }
    return networkRes;
  } catch {
    // Network failed — try cache.
    const cached = await cache.match(req);
    if (cached) {
      // Add a header so the UI knows this is stale data.
      const headers = new Headers(cached.headers);
      headers.set("X-Served-From", "cache");
      headers.set("X-Cache-Date", cached.headers.get("date") || "");
      const body = await cached.blob();
      return new Response(body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }
    // No cached version — return a 503 with a friendly error.
    return new Response(
      JSON.stringify({
        error: "Offline and no cached data available",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// === Static asset handler: stale-while-revalidate ===
async function handleStaticAsset(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  // Revalidate in the background.
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  // Return cached version immediately if available, else wait for network.
  return cached || (await networkPromise) || new Response("", { status: 504 });
}

// === Image handler: cache-first with size limit ===
async function handleImageRequest(req) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    // Revalidate in the background.
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          cache.put(req, res.clone()).catch(() => {});
          trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX);
        }
      })
      .catch(() => {});
    return cached;
  }
  // No cache — fetch from network.
  try {
    const networkRes = await fetch(req);
    if (networkRes && networkRes.ok) {
      cache.put(req, networkRes.clone()).catch(() => {});
      trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX);
    }
    return networkRes;
  } catch {
    return new Response("", { status: 504 });
  }
}

// === Offline page — bilingual (FA/EN) ===
function getOfflinePage() {
  return new Response(
    `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>آفلاین — Ai Crypto Discovery</title>
<style>
  * { box-sizing: border-box; }
  body {
    background: #0d0f12; color: #f4f1ea; font-family: sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; margin: 0; padding: 1rem; text-align: center;
  }
  .container { max-width: 400px; }
  h1 { color: #2dd4bf; font-size: 1.75rem; margin-bottom: 0.5rem; }
  p { color: #8b94a3; font-size: 0.95rem; line-height: 1.5; }
  button {
    background: #2dd4bf; color: #04201d; border: none;
    padding: 0.7rem 1.5rem; border-radius: 9999px; font-weight: bold;
    cursor: pointer; margin-top: 1.5rem; font-size: 0.95rem;
    transition: transform 0.15s;
  }
  button:hover { transform: scale(1.05); }
  button:active { transform: scale(0.98); }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  .hint { color: #6b7280; font-size: 0.8rem; margin-top: 1rem; }
</style>
</head>
<body>
  <div class="container">
    <div class="icon">🌐</div>
    <h1>آفلاین هستید</h1>
    <p>در حال حاضر به اینترنت متصل نیستید. آخرین محتوای ذخیره‌شده در مرورگر شما قابل دسترس است.</p>
    <button onclick="location.reload()">تلاش مجدد</button>
    <div class="hint">You are offline. Cached content is still available.</div>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

// === MESSAGE: allow the page to trigger an update ===
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// === PERIODIC SYNC (optional, where supported) — refresh caches in background ===
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "refresh-content") {
    event.waitUntil(refreshContent());
  }
});

async function refreshContent() {
  // Refresh the home page and key API endpoints in the background.
  try {
    const cache = await caches.open(PAGE_CACHE);
    await Promise.all(
      KEY_ROUTES.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) await cache.put(url, res.clone());
        } catch {
          // ignore — we'll try again next sync
        }
      })
    );
    const apiCache = await caches.open(API_CACHE);
    const apiEndpoints = ["/api/feed?limit=10", "/api/prices", "/api/market/fear-greed"];
    await Promise.all(
      apiEndpoints.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) await apiCache.put(url, res.clone());
        } catch {
          // ignore
        }
      })
    );
  } catch {
    // ignore — periodic sync is best-effort
  }
}
