"use client";

import { useSyncExternalStore } from "react";

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
  const subscribeFn = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    // Custom event for same-tab updates
    window.addEventListener(`acd:${key}-changed`, callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(`acd:${key}-changed`, callback);
    };
  };

  const getSnapshot = (): T => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      return parse(raw);
    } catch {
      return defaultValue;
    }
  };

  const getServerSnapshot = (): T => defaultValue;

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
    window.dispatchEvent(new CustomEvent(`acd:${key}-changed`));
  } catch {
    // ignore
  }
}
