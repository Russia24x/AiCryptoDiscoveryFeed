"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "@/lib/query-client";

/**
 * Wrap the app with TanStack Query Provider.
 *
 * Usage in layout.tsx:
 *   <Providers>{children}</Providers>
 *
 * Why a separate component:
 *   - "use client" is required because QueryClientProvider uses React context.
 *   - We create the QueryClient in useState so it persists across re-renders
 *     but is recreated if the component remounts (e.g., on hot reload in dev).
 *   - DevTools are only included in development to keep the production
 *     bundle small.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
