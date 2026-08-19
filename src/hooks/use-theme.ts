"use client";

import { useSyncExternalStore, useCallback } from "react";

/**
 * Theme hook — supports dark / light / system, persisted to localStorage.
 *
 * Implementation: uses `useSyncExternalStore` for SSR-safe theme reads
 * (avoids the `useEffect(() => setMode(...), [])` pattern that React 19's
 * ESLint plugin flags as `react-hooks/set-state-in-effect`).
 *
 * On the server, returns "dark" (brand default). On the client, after
 * hydration, reads the stored preference from localStorage. If "system",
 * follows `prefers-color-scheme: media` and updates when the user's OS
 * preference changes.
 *
 * The actual theme application happens in this hook — we toggle a class on
 * <html> whenever the effective theme changes.
 */

export type ThemeMode = "dark" | "light" | "system";
export type EffectiveTheme = "dark" | "light";

const STORAGE_KEY = "acd:theme";

let cached: ThemeMode | null = null;

function readStored(): ThemeMode {
  if (cached) return cached;
  if (typeof window === "undefined") return "dark"; // default for SSR
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") {
      cached = raw;
      return raw;
    }
  } catch {
    // ignore
  }
  cached = "dark"; // brand default
  return "dark";
}

function writeStored(mode: ThemeMode) {
  cached = mode;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent("acd:theme-changed", { detail: mode }));
  } catch {
    // ignore
  }
}

/** Resolve the OS preference (only meaningful if mode === "system"). */
function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveEffective(mode: ThemeMode): EffectiveTheme {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

/** Apply the resolved theme to <html> via class + style attribute. */
function applyThemeToDOM(theme: EffectiveTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#0d0f12");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#f4f1ea");
  }
}

// === External store: subscribe to theme changes ===
// We use a module-level store so all `useTheme()` calls share state.
const listeners = new Set<() => void>();

function subscribeMode(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    window.addEventListener("acd:theme-changed", callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
      window.removeEventListener("acd:theme-changed", callback);
    }
  };
}

function getModeSnapshot(): ThemeMode {
  return readStored();
}

function getModeServerSnapshot(): ThemeMode {
  return "dark";
}

// === Effective theme store (depends on mode + OS preference) ===
function subscribeEffective(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    window.addEventListener("acd:theme-changed", callback);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", callback);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", callback);
      window.removeEventListener("acd:theme-changed", callback);
      mq.removeEventListener("change", callback);
    };
  }
  return () => listeners.delete(callback);
}

function getEffectiveSnapshot(): EffectiveTheme {
  return resolveEffective(readStored());
}

function getEffectiveServerSnapshot(): EffectiveTheme {
  return "dark";
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

export function useTheme() {
  const mode = useSyncExternalStore(
    subscribeMode,
    getModeSnapshot,
    getModeServerSnapshot
  );
  const effective = useSyncExternalStore(
    subscribeEffective,
    getEffectiveSnapshot,
    getEffectiveServerSnapshot
  );

  // Apply theme to DOM whenever effective changes.
  // Using `useEffect` here is correct because we're synchronizing external
  // state (the DOM) with React state — this is exactly what effects are for.
  // (Note: this is not the `useEffect(() => setMode(...), [])` pattern that
  // triggers the ESLint warning — we're not calling setState in effect.)
  const applyEffect = useCallback(() => {
    applyThemeToDOM(effective);
  }, [effective]);
  // Apply synchronously on client (after hydration) — useSyncExternalStore
  // already handles the hydration boundary correctly.
  if (typeof window !== "undefined") {
    applyThemeToDOM(effective);
  }

  const setTheme = useCallback((next: ThemeMode) => {
    writeStored(next);
    notifyListeners();
  }, []);

  const cycle = useCallback(() => {
    const current = readStored();
    setTheme(current === "dark" ? "light" : current === "light" ? "system" : "dark");
  }, [setTheme]);

  // `hydrated` — true once we're on the client. We use `useSyncExternalStore`'s
  // server snapshot to know: if mode !== "dark" (server default), we're hydrated.
  // Simpler: a separate `useSyncExternalStore` that returns true on client only.
  // But to avoid an extra hook import cycle, we infer it: hydrated = (mode !== getModeServerSnapshot()) || (typeof window !== 'undefined' && cached !== null)
  const hydrated = typeof window !== "undefined" && cached !== null;

  return {
    mode,
    effective,
    hydrated,
    setTheme,
    cycle,
    /** Localized label for the current mode. */
    label: (lang: "fa" | "en") =>
      mode === "dark"
        ? lang === "fa" ? "تیره" : "Dark"
        : mode === "light"
        ? lang === "fa" ? "روشن" : "Light"
        : lang === "fa" ? "سیستمی" : "System",
  };
}
