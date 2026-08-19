"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { makeQueryClient } from "@/lib/query-client";

/**
 * Wrap the app with TanStack Query Provider + Framer Motion Config.
 *
 * MotionConfig:
 *   - `reducedMotion="user"` respects the user's `prefers-reduced-motion`
 *     setting and disables animations accordingly (accessibility).
 *   - In Framer Motion 12, `MotionConfig` no longer accepts `initial={false}`.
 *     Instead, we prevent SSR hydration mismatches by gating data-dependent
 *     components (like FeedCard) behind `loading` state in `useFeed`, which
 *     is in turn gated behind a `mounted` flag — so motion components are
 *     never rendered during SSR or client first render.
 *
 * Usage in layout.tsx:
 *   <Providers>{children}</Providers>
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
