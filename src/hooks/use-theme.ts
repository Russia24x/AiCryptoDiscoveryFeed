"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Theme hook — supports dark / light / system, persisted to localStorage.
 *
 * On first render after hydration, reads the stored preference. If "system",
 * follows `prefers-color-scheme: media` and updates when the user's OS
 * preference changes.
 *
 * The actual theme application happens in `layout.tsx` (or anywhere) by
 * toggling a class on <html>. We just expose the current effective theme.
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
    // Update meta theme-color for mobile
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

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [effective, setEffective] = useState<EffectiveTheme>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const m = readStored();
    setMode(m);
    setEffective(resolveEffective(m));
    setHydrated(true);

    // Apply immediately on hydration
    applyThemeToDOM(resolveEffective(m));

    // Subscribe to mode changes (from other tabs or this tab)
    const onModeChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail as ThemeMode | undefined;
      const next = detail || readStored();
      setMode(next);
      const eff = resolveEffective(next);
      setEffective(eff);
      applyThemeToDOM(eff);
    };
    window.addEventListener("storage", onModeChange as EventListener);
    window.addEventListener("acd:theme-changed", onModeChange as EventListener);

    // Subscribe to OS dark/light changes (only affects "system" mode)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      const current = readStored();
      if (current === "system") {
        const eff = resolveEffective("system");
        setEffective(eff);
        applyThemeToDOM(eff);
      }
    };
    mq.addEventListener("change", onMediaChange);

    return () => {
      window.removeEventListener("storage", onModeChange as EventListener);
      window.removeEventListener("acd:theme-changed", onModeChange as EventListener);
      mq.removeEventListener("change", onMediaChange);
    };
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    writeStored(next);
    setMode(next);
    const eff = resolveEffective(next);
    setEffective(eff);
    applyThemeToDOM(eff);
  }, []);

  const cycle = useCallback(() => {
    setTheme(mode === "dark" ? "light" : mode === "light" ? "system" : "dark");
  }, [mode, setTheme]);

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
