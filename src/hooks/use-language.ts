"use client";

import { useEffect, useState, useCallback } from "react";
import { translations, type Language, type TranslationKeys } from "@/i18n/translations";

const STORAGE_KEY = "acd:lang";

let cachedLang: Language | null = null;

function readStorage(): Language {
  if (cachedLang) return cachedLang;
  if (typeof window === "undefined") return "fa";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "fa" || raw === "en") {
      cachedLang = raw;
      return raw;
    }
  } catch {
    // ignore
  }
  // Default: Persian (RTL is the primary audience per brand guide)
  cachedLang = "fa";
  return "fa";
}

function writeStorage(lang: Language) {
  cachedLang = lang;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent("acd:lang-changed", { detail: lang }));
  } catch {
    // ignore
  }
}

/** Subscribe to language changes (cross-tab + same-tab). */
export function useLanguage() {
  const [lang, setLang] = useState<Language>("fa");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Defer to avoid cascading renders in dev strict mode
    const id = window.setTimeout(() => {
      setLang(readStorage());
      setHydrated(true);
    }, 0);

    const onChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail as Language | undefined;
      setLang(detail || readStorage());
    };
    window.addEventListener("storage", onChange as EventListener);
    window.addEventListener("acd:lang-changed", onChange as EventListener);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("storage", onChange as EventListener);
      window.removeEventListener("acd:lang-changed", onChange as EventListener);
    };
  }, []);

  // Reflect language in <html lang dir>
  useEffect(() => {
    if (!hydrated) return;
    const t = translations[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
  }, [lang, hydrated]);

  const setLanguage = useCallback((next: Language) => {
    writeStorage(next);
    setLang(next);
  }, []);

  const toggle = useCallback(() => {
    setLanguage(lang === "fa" ? "en" : "fa");
  }, [lang, setLanguage]);

  // Build a t() helper that returns the string for the active language
  const t: TranslationKeys = translations[lang];

  return {
    lang,
    setLanguage,
    toggle,
    t,
    hydrated,
    dir: translations[lang].dir,
    isRTL: translations[lang].dir === "rtl",
  };
}
