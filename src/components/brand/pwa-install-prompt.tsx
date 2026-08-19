"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useLanguage } from "@/hooks/use-language";

const DISMISSAL_KEY = "acd:pwa-install-dismissed";
const DISMISSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * PWA Install Prompt — shows a toast-like banner inviting the user to
 * install the app as a PWA.
 *
 * Behavior:
 *  - On Chrome/Edge/Android: shown when `beforeinstallprompt` has fired
 *    AND the user hasn't dismissed it in the last 7 days.
 *  - On iOS Safari: shown if not running in standalone mode AND the user
 *    hasn't dismissed it in the last 7 days. Tapping it doesn't trigger
 *    a native prompt — instead, we show step-by-step instructions.
 *  - Hidden if already running as standalone PWA.
 */
export function PWAInstallPrompt() {
  const { canInstall, isStandalone, promptInstall } = usePWAInstall();
  const { t, lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Detect iOS Safari (no beforeinstallprompt support)
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    const isiOSDevice = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOSDevice);
  }, []);

  // Show/hide based on state + dismissal timestamp
  useEffect(() => {
    if (isStandalone) {
      setVisible(false);
      return;
    }
    if (!canInstall && !isIOS) {
      setVisible(false);
      return;
    }
    try {
      const dismissed = localStorage.getItem(DISMISSAL_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (Date.now() - dismissedAt < DISMISSAL_TTL_MS) {
          setVisible(false);
          return;
        }
      }
    } catch {
      // ignore
    }
    // Delay showing by 3s so it doesn't compete with first paint
    const id = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(id);
  }, [canInstall, isStandalone, isIOS]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    const result = await promptInstall();
    if (result === "accepted" || result === "dismissed") {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Main install prompt */}
      <div
        role="dialog"
        aria-label={lang === "fa" ? "نصب اپلیکیشن" : "Install app"}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-fade-up"
      >
        <div className="bg-[var(--brand-surface)] border border-[var(--brand-accent)]/30 rounded-xl shadow-xl shadow-black/20 overflow-hidden">
          <div className="flex items-start gap-3 p-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--brand-accent-soft)] flex items-center justify-center">
              <Download className="w-5 h-5 text-[var(--brand-accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[var(--brand-text)]">
                {lang === "fa" ? "نصب اپلیکیشن" : "Install App"}
              </h3>
              <p className="text-xs text-[var(--brand-muted)] mt-0.5 leading-relaxed">
                {lang === "fa"
                  ? "این سایت رو روی صفحه اصلی نصب کن تا مثل یک اپ واقعی اجرا بشه — حتی آفلاین."
                  : "Install this site as an app for quick access — works offline."}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleInstall}
                  className="text-xs font-bold bg-[var(--brand-accent)] text-[#04201d] px-3 py-1.5 rounded-md hover:brightness-110 transition-all"
                >
                  {lang === "fa" ? "نصب" : "Install"}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-[var(--brand-muted)] hover:text-[var(--brand-text)] px-2 py-1.5 rounded-md transition-colors"
                  aria-label={lang === "fa" ? "بستن" : "Close"}
                >
                  {lang === "fa" ? "بعدا" : "Later"}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors"
              aria-label={lang === "fa" ? "بستن" : "Close"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS instructions modal */}
      {showIOSInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl shadow-2xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--brand-text)]">
                {lang === "fa" ? "نصب روی iOS" : "Install on iOS"}
              </h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors"
                aria-label={lang === "fa" ? "بستن" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-2.5 text-xs text-[var(--brand-muted)]">
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] flex items-center justify-center font-bold text-[10px]">1</span>
                <span className="leading-relaxed">
                  {lang === "fa"
                    ? "روی دکمه Share در نوار پایلی سافاری ضربه بزن."
                    : "Tap the Share button in Safari's bottom toolbar."}
                </span>
                <Share className="shrink-0 w-3.5 h-3.5 text-[var(--brand-accent)] mt-0.5" />
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] flex items-center justify-center font-bold text-[10px]">2</span>
                <span className="leading-relaxed">
                  {lang === "fa"
                    ? "به پایین اسکرول کن و روی «Add to Home Screen» ضربه بزن."
                    : "Scroll down and tap \"Add to Home Screen\"."}
                </span>
                <PlusSquare className="shrink-0 w-3.5 h-3.5 text-[var(--brand-accent)] mt-0.5" />
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] flex items-center justify-center font-bold text-[10px]">3</span>
                <span className="leading-relaxed">
                  {lang === "fa"
                    ? "روی «Add» ضربه بزن تا آیکون اضافه بشه."
                    : "Tap \"Add\" to confirm."}
                </span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-4 w-full text-xs font-bold bg-[var(--brand-accent)] text-[#04201d] py-2 rounded-md hover:brightness-110 transition-all"
            >
              {lang === "fa" ? "متوجه شدم" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
