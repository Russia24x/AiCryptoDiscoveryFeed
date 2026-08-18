/**
 * Service Worker for Ai Crypto Discovery
 *
 * Provides offline-first capabilities:
 *  1. Pre-caches the app shell (HTML, JS, CSS, fonts) on install.
 *  2. For navigation requests: serves cached HTML when offline, falls back
 *     to network when online (network-first strategy).
 *  3. For static assets (JS, CSS, images, fonts): stale-while-revalidate.
 *  4. For API requests (/api/*): network-first, falls back to last cached
 *     response if network fails. This means the user can see the last
 *     fetched feed/prices even when offline.
 *
 * Version: 1.0.0 — bumped on every release to trigger SW update.
 */

const VERSION = "v1.0.0-phase12";
const STATIC_CACHE = `acd-static-${VERSION}`;
const API_CACHE = `acd-api-${VERSION}`;

// Files that make up the "app shell" — without these, the page can't
// render at all. We pre-cache these on install so the app works offline
// from first load.
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/robots.txt",
];

// === INSTALL: pre-cache the app shell ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Use addAll with ignore-failures semantics by adding one-by-one
      // (so a 404 on one resource doesn't abort the whole install).
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

// === ACTIVATE: clean up old caches ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (!key.startsWith("acd-")) return caches.delete(key);
          if (key !== STATIC_CACHE && key !== API_CACHE) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      // Take control of all clients immediately
      await self.clients.claim();
    })()
  );
});

// === FETCH: routing strategy ===
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests; ignore everything else.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don't intercept cross-origin requests (e.g., fonts from Google Fonts,
  // RSS feed sources). These are usually handled by the browser cache
  // already and we don't want to add CORS complexity.
  if (url.origin !== self.location.origin) return;

  // === API requests: network-first, fall back to cache ===
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          // Try the network first.
          const networkRes = await fetch(req);
          // If successful, cache a copy for future offline use.
          if (networkRes && networkRes.ok) {
            const cache = await caches.open(API_CACHE);
            // Use a clone because the response can only be consumed once.
            // Limit cache size by only caching GET responses under 1MB.
            const clone = networkRes.clone();
            const text = await clone.text();
            if (text.length < 1024 * 1024) {
              await cache.put(req, networkRes.clone());
            }
          }
          return networkRes;
        } catch (err) {
          // Network failed — try cache as fallback.
          const cache = await caches.open(API_CACHE);
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
      })()
    );
    return;
  }

  // === Navigation requests (HTML page loads): network-first, fall back to cache ===
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req);
          // Cache the latest HTML for offline use.
          const cache = await caches.open(STATIC_CACHE);
          cache.put("/", networkRes.clone()).catch(() => {});
          return networkRes;
        } catch {
          // Network failed — serve the cached app shell.
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match("/") || await cache.match(req);
          if (cached) return cached;
          // Final fallback — a minimal offline page.
          return new Response(
            `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<title>آفلاین — Ai Crypto Discovery</title>
<style>
  body { background: #0d0f12; color: #f4f1ea; font-family: sans-serif;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; padding: 1rem; text-align: center; }
  h1 { color: #2dd4bf; font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #8b94a3; font-size: 0.95rem; }
  button { background: #2dd4bf; color: #04201d; border: none;
           padding: 0.6rem 1.2rem; border-radius: 9999px; font-weight: bold;
           cursor: pointer; margin-top: 1rem; }
</style>
</head>
<body>
  <div>
    <h1>🌐 آفلاین هستید</h1>
    <p>در حال حاضر به اینترنت متصل نیستید. آخرین محتوای ذخیره‌شده در مرورگر شما قابل دسترس است.</p>
    <button onclick="location.reload()">تلاش مجدد</button>
  </div>
</body>
</html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        }
      })()
    );
    return;
  }

  // === Static assets (JS, CSS, images, fonts): stale-while-revalidate ===
  event.respondWith(
    (async () => {
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
    })()
  );
});

// === MESSAGE: allow the page to trigger an update ===
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
