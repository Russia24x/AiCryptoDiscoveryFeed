"use client";

import { useSyncExternalStore, useCallback } from "react";

/**
 * usePWAInstall — exposes the browser's "Add to Home Screen" / install
 * prompt in a React-friendly way.
 *
 * Behavior:
 *  - On Chrome/Edge/Android, the browser fires `beforeinstallprompt` when
 *    the PWA criteria are met (HTTPS, manifest, SW, engagement heuristic).
 *  - We capture that event and stash it. The UI can then show an "Install"
 *    button whenever `canInstall` is true.
 *  - When the user clicks the button, call `promptInstall()` — this shows
 *    the native install prompt.
 *  - After the user accepts/rejects, the event is consumed and we reset
 *    `canInstall` to false (the browser won't fire `beforeinstallprompt`
 *    again until the user clears site data, OR — in newer Chrome versions —
 *    until enough time has passed since the last dismissal).
 *
 * On Safari/iOS, `beforeinstallprompt` is never fired; users must use the
 * Share → Add to Home Screen menu manually. We expose `isIOS` / `isStandalone`
 * so the UI can show a tooltip guiding iOS users to that menu.
 *
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 *  - https://web.dev/articles/customize-install
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

// === External store for the deferred prompt event ===
// We use a module-level singleton so all components share the same state
// (multiple hook instances will all see the same `canInstall` value).

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

// === Install the global event listeners (runs once per page load) ===
if (typeof window !== "undefined") {
  // Capture the deferred prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the default mini-info bar on mobile
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  // Listen for successful installs
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notifyListeners();
  });

  // Detect if already running as installed PWA
  if (window.matchMedia("(display-mode: standalone)").matches) {
    installed = true;
  }
  // iOS Safari doesn't support `display-mode: standalone` reliably, but
  // sets `navigator.standalone` instead.
  if ((navigator as any).standalone === true) {
    installed = true;
  }
}

function getSnapshot() {
  return deferredPrompt !== null;
}

function getServerSnapshot() {
  return false;
}

export function usePWAInstall() {
  const canInstall = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isStandalone = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false
  );

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      installed = true;
      notifyListeners();
    }
    // Either way, the event is consumed — clear it.
    deferredPrompt = null;
    notifyListeners();
    return choice.outcome;
  }, []);

  return {
    /** True if the browser has fired `beforeinstallprompt` and is ready to install. */
    canInstall,
    /** True if the app is already running as an installed PWA (standalone mode). */
    isStandalone,
    /** Show the native install prompt. Returns 'accepted' | 'dismissed' | null. */
    promptInstall,
  };
}
