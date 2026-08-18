"use client";

import { useEffect, useState } from "react";

/**
 * useServiceWorker — registers the service worker and tracks its state.
 *
 * On mount (in production only — not in dev to avoid caching frustrations),
 * registers `/sw.js` and listens for updates. When a new SW takes control,
 * we expose `updateAvailable` so the UI can show a "Refresh to update"
 * prompt.
 *
 * The user must reload the page to activate the new SW because we use
 * `skipWaiting` only after explicit user consent (otherwise the page
 * would suddenly switch to new code mid-session, which can cause broken
 * state if the new SW has incompatible cache schemas).
 */
export function useServiceWorker() {
  const [registered, setRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Skip in dev to avoid caching headaches (you'd have to constantly
    // hard-reload to see changes). In dev, dev tools > Application > SW
    // can be used to manually test.
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        setRegistered(true);

        // Watch for new SW waiting to activate
        const checkForUpdate = () => {
          if (reg.waiting) {
            setUpdateAvailable(true);
            setWaitingWorker(reg.waiting);
          }
        };
        checkForUpdate();

        // Listen for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && reg.waiting) {
              setUpdateAvailable(true);
              setWaitingWorker(reg.waiting);
            }
          });
        });

        // If the controlling SW changes (after skipWaiting), reload page.
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      } catch (err) {
        console.warn("SW registration failed:", err);
      }
    };

    // Defer registration to avoid competing with first-paint resources.
    const id = window.setTimeout(register, 1500);
    return () => window.clearTimeout(id);
  }, []);

  /** User-confirmed update: tell the waiting SW to skip waiting. */
  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage("SKIP_WAITING");
    }
  };

  return {
    registered,
    updateAvailable,
    applyUpdate,
  };
}
