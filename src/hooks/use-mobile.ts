import * as React from "react";

/**
 * useIsMobile — returns true if the viewport width is below the mobile
 * breakpoint (768px).
 *
 * Implementation: uses `useSyncExternalStore` for SSR-safe media query reads
 * (avoids the `useEffect(() => setState(...), [])` pattern that React 19's
 * ESLint plugin flags as `react-hooks/set-state-in-effect`).
 *
 * On the server, returns `false` (default desktop assumption). On the client,
 * after hydration, returns the actual viewport state and updates on resize.
 */

const MOBILE_BREAKPOINT = 768;

function subscribeMobile(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getMobileServerSnapshot(): boolean {
  return false;
}

export function useIsMobile() {
  const isMobile = React.useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getMobileServerSnapshot
  );
  return isMobile;
}
