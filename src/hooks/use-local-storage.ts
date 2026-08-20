"use client";

import { useSyncExternalStore, useRef, useCallback } from "react";

/**
 * useLocalStorage — SSR-safe localStorage subscription hook.
 *
 * Returns the current value of a localStorage key, automatically re-rendering
 * when the value changes (either from this tab or cross-tab via the `storage`
 * event).
 *
 * This replaces the common pattern:
 *   const [value, setValue] = useState(defaultValue);
 *   useEffect(() => {
 *     const stored = localStorage.getItem(key);
 *     if (stored) setValue(JSON.parse(stored));
 *     const onChange = () => setValue(...);
 *     window.addEventListener("storage", onChange);
 *     return () => window.removeEventListener("storage", onChange);
 *   }, []);
 *
 * That pattern triggers React 19's ESLint `react-hooks/set-state-in-effect`
 * warning. Using `useSyncExternalStore` is the recommended alternative.
 *
 * On the server, returns `getServerSnapshot` (the provided default value).
 * On the client, after hydration, returns the actual stored value.
 *
 * CRITICAL: getSnapshot must return a STABLE reference when the underlying
 * data hasn't changed. React's useSyncExternalStore compares the snapshot
 * with Object.is on every render — if getSnapshot returns a new object
 * every time (e.g. via JSON.parse), React thinks the data changed and
 * re-renders, causing an infinite loop ("Maximum update depth exceeded").
 * We cache the parsed value in a ref and only re-parse when the raw
 * localStorage string actually changes.
 *
 * @param key localStorage key
 * @param defaultValue fallback if the key is missing or invalid
 * @param parse function to parse the stored string (default: JSON.parse)
 * @param serialize function to serialize the value for storage (default: JSON.stringify)
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T = (raw) => JSON.parse(raw) as T
): T {
  // Cache the last-seen raw string and its parsed value. Without this
  // cache, useSyncExternalStore would call getSnapshot on every render
  // and JSON.parse would return a NEW object each time (different
  // reference), causing React to detect a "change" and re-render
  // infinitely.
  const cachedRawRef = useRef<string | null>(null);
  const cachedValueRef = useRef<T | null>(null);

  const subscribeFn = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    // Listen for both 'storage' (cross-tab) and our custom same-tab event.
    // The custom event name is `${key}-changed` (NOT `acd:${key}-changed`)
    // because the key already includes the "acd:" prefix in our codebase
    // (e.g. WEATHER_KEY = "acd:weather-city"). This matches the event
    // dispatch convention used by use-bookmarks, use-read-later, use-theme,
    // use-language, and use-search-history.
    window.addEventListener("storage", callback);
    window.addEventListener(`${key}-changed`, callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(`${key}-changed`, callback);
    };
  };

  const getSnapshot = useCallback((): T => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      // If raw hasn't changed since last call, return the cached parsed
      // value — same reference, so React's Object.is check passes and
      // no re-render is triggered.
      if (raw === cachedRawRef.current && cachedValueRef.current !== null) {
        return cachedValueRef.current;
      }
      if (!raw) {
        cachedRawRef.current = null;
        cachedValueRef.current = null;
        return defaultValue;
      }
      const parsed = parse(raw);
      cachedRawRef.current = raw;
      cachedValueRef.current = parsed;
      return parsed;
    } catch {
      cachedRawRef.current = null;
      cachedValueRef.current = null;
      return defaultValue;
    }
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback((): T => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot);
}

/**
 * Helper to write to localStorage and notify subscribers.
 * Use this alongside `useLocalStorage` to update values.
 */
export function writeLocalStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Event name is `${key}-changed` to match useLocalStorage's subscribeFn.
    // (Key already includes the "acd:" prefix, so the event is
    // "acd:weather-city-changed" — same as the convention used by
    // use-bookmarks, use-read-later, use-theme, etc.)
    window.dispatchEvent(new CustomEvent(`${key}-changed`));
  } catch {
    // ignore
  }
}
