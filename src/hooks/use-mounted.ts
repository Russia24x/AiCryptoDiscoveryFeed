"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns `true` only after the component has mounted on the client.
 *
 * Use this to gate renders that depend on browser-only APIs (localStorage,
 * matchMedia, Framer Motion entrance animations, etc.) to avoid SSR
 * hydration mismatches.
 *
 * Implementation notes:
 *   - We use `useSyncExternalStore` instead of the classic
 *     `useEffect(() => setMounted(true), [])` pattern, because React 19's
 *     ESLint plugin (`react-hooks/set-state-in-effect`) flags the latter as
 *     an anti-pattern (cascading renders).
 *   - `useSyncExternalStore` is the React-blessed way to read from external
 *     stores (like `window`) without hydration mismatches: on the server
 *     it returns `getServerSnapshot()` (false), and on the client it returns
 *     `getSnapshot()` (true) AFTER hydration completes.
 *   - The "external store" here is a constant — it's always `true` on the
 *     client. We just need a stable subscribe function that does nothing
 *     (no real subscription needed).
 *
 * Pattern:
 *   const mounted = useMounted();
 *   return mounted ? <MotionComponent .../> : <PlainComponent .../>;
 *
 * Server render: `mounted === false` → plain element rendered.
 * Client first render: `mounted === false` → plain element rendered (matches server).
 * After hydration: `mounted === true` → motion element rendered (state update).
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
