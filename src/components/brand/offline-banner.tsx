"use client";

import { useSyncExternalStore, useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

/**
 * OfflineBanner — shows a small banner at the top of the page when
 * the browser is offline.
 *
 * Implementation: uses `useSyncExternalStore` to read `navigator.onLine`
 * in an SSR-safe way (avoids the React 19 ESLint `set-state-in-effect`
 * warning that the previous `useEffect(() => setIsOnline(navigator.onLine), [])`
 * pattern triggered).
 */

// === External store for navigator.onLine ===
const onlineListeners = new Set<() => void>();

function subscribeOnline(callback: () => void): () => void {
  onlineListeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
      onlineListeners.delete(callback);
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);
    };
  }
  return () => onlineListeners.delete(callback);
}

function getOnlineSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getOnlineServerSnapshot(): boolean {
  return true; // assume online on the server
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { lang } = useLanguage();

  // Track transitions to "back online" — this is a derived state that depends
  // on the previous offline state. We use useEffect here because we're
  // synchronizing external state (online status) with a "memory" of the
  // previous state (wasOffline). This is a legitimate use of useEffect
  // (not the anti-pattern the ESLint rule flags).
  useEffect(() => {
    if (!isOnline) {
      // Just went offline
      setWasOffline(true);
      setDismissed(false);
    } else if (wasOffline) {
      // Just came back online — auto-clear the "was offline" flag after 3s
      const id = setTimeout(() => setWasOffline(false), 3000);
      return () => clearTimeout(id);
    }
    // No cleanup needed for the offline branch
    return undefined;
  }, [isOnline, wasOffline]);

  // Don't render anything if online and never been offline
  if (isOnline && !wasOffline) return null;
  // Dismissed offline banner stays dismissed until next offline event
  if (!isOnline && dismissed) return null;

  const isOffline = !isOnline;
  const isBackOnline = isOnline && wasOffline;

  return (
    <div
      className={cn(
        "fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md",
        "rounded-lg shadow-lg backdrop-blur-md border",
        "transition-all duration-300",
        isOffline
          ? "bg-amber-500/95 border-amber-400 text-amber-950"
          : "bg-[var(--brand-accent)] border-[var(--brand-accent)] text-[#04201d]",
        isBackOnline ? "opacity-100 translate-y-0" : "opacity-100 translate-y-0"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        {isOffline ? (
          <WifiOff className="w-4 h-4 shrink-0" />
        ) : (
          <Wifi className="w-4 h-4 shrink-0" />
        )}
        <span className="text-xs font-bold flex-1">
          {isOffline
            ? lang === "fa"
              ? "آفلاین هستید — نمایش آخرین داده‌های ذخیره‌شده"
              : "You're offline — showing last cached data"
            : lang === "fa"
            ? "آنلاین شدید — مجدداً متصل هستید"
            : "Back online"}
        </span>
        {isOffline && (
          <>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-md bg-amber-950/20 hover:bg-amber-950/30 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              {lang === "fa" ? "تلاش مجدد" : "Retry"}
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label={lang === "fa" ? "بستن" : "Dismiss"}
              className="p-1 rounded-md hover:bg-amber-950/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
