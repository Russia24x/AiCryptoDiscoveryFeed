"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` only after the component has mounted on the client.
 *
 * Use this to gate renders that depend on browser-only APIs (localStorage,
 * matchMedia, Framer Motion entrance animations, etc.) to avoid SSR
 * hydration mismatches.
 *
 * Pattern:
 *   const mounted = useMounted();
 *   return mounted ? <MotionComponent .../> : <PlainComponent .../>;
 *
 * Server render: `mounted === false` → plain element rendered.
 * Client first render: `mounted === false` → plain element rendered (matches server).
 * After useEffect: `mounted === true` → motion element rendered (state update).
 *
 * This is the recommended pattern for Framer Motion + Next.js SSR.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
