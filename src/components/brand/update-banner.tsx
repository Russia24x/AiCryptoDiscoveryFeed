"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { useLanguage } from "@/hooks/use-language";

/**
 * UpdateBanner — shows a small banner at the bottom of the screen when a
 * new service worker version is waiting to take control. Clicking "Refresh"
 * activates the new SW and reloads the page.
 *
 * Auto-dismissed after 30s if the user ignores it. The new SW will be
 * activated anyway on the next page visit (since we use skipWaiting on
 * next install).
 */
export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker();
  const { lang } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!updateAvailable) return;
    const id = setTimeout(() => setDismissed(true), 30000);
    return () => clearTimeout(id);
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--brand-surface)] border border-[var(--brand-accent)]/40 shadow-xl backdrop-blur-md">
        <Sparkles className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[var(--brand-text)]">
            {lang === "fa" ? "نسخه جدید آماده است" : "New version available"}
          </p>
          <p className="text-[10px] text-[var(--brand-muted)] truncate">
            {lang === "fa"
              ? "برای به‌روزرسانی و فعال‌سازی تغییرات، صفحه را بازخوانی کنید."
              : "Reload the page to apply the update."}
          </p>
        </div>
        <button
          onClick={applyUpdate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110 transition-all shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          {lang === "fa" ? "به‌روزرسانی" : "Update"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label={lang === "fa" ? "بستن" : "Dismiss"}
          className="p-1 rounded-full text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-surface-2)] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
