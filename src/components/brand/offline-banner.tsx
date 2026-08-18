"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

/**
 * OfflineBanner — shows a small banner at the top of the page when
 * the browser is offline.
 *
 * Behavior:
 *  - Listens to `online` / `offline` events.
 *  - When offline: shows a banner with "You're offline — showing last cached data".
 *  - When back online: shows a brief "Back online" toast-like banner that
 *    auto-dismisses after 3s, then disappears.
 *  - Has a "Retry" button to manually re-fetch the feed.
 *
 * The actual offline data persistence is handled by:
 *  - localStorage feed cache (in useFeed hook — stores last successful response)
 *  - Service worker (registered in layout.tsx) that caches the HTML shell
 *    and static assets so the page can render even on first load when offline.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOnline(navigator.onLine);

    const onOnline = () => {
      setIsOnline(true);
      // After coming back online, the "was offline" state lingers briefly
      // so we can show the green "back online" confirmation.
      if (wasOffline) {
        setTimeout(() => setWasOffline(false), 3000);
      }
    };
    const onOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setDismissed(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [wasOffline]);

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
