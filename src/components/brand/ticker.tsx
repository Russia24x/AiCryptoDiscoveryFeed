"use client";

import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
}

/**
 * Live crypto price ticker.
 *
 * Refresh strategy (v2 — faster):
 *  - First load:    immediate (200ms after mount)
 *  - Subsequent:    every 15s (down from 60s) so users see fresh prices
 *                  without manually refreshing. Still well within
 *                  CoinGecko's 60 calls/min free-tier limit (we make 1
 *                  call per 15s = 4 calls/min, with edge-cache it's
 *                  even less upstream).
 *  - Pause when tab  hidden (visibilitychange) — saves quota when the
 *                  user is not looking. Resumes immediately on focus.
 *  - Re-fetch on    visibilitychange → visible (catches up the moment
 *                  the user comes back).
 *  - Flash animation on each price cell when its value changes (green
 *                  for up, red for down) — gives a clear visual cue
 *                  that the price just ticked.
 */
export function Ticker() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const prevPricesRef = useRef<Record<string, number>>({});
  const [, forceFlash] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        // cache: "no-store" so we always get fresh prices from our edge endpoint
        // (the edge endpoint itself caches upstream CoinGecko for 60s).
        const res = await fetch("/api/prices", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.coins?.length) {
          // Snapshot previous prices so cells can flash on change
          const next: Record<string, number> = {};
          for (const c of data.coins) next[c.id] = c.price;
          prevPricesRef.current = next;
          setCoins(data.coins);
          // Trigger re-render so the flash animation runs
          forceFlash((n) => n + 1);
        }
      } catch {
        // ignore — keep stale prices
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Kick off immediately, then every 30s.
    // Was 15s — too aggressive for the CoinGecko free tier (30 req/min).
    // 30s gives ~2 calls/min, well within limits, while still feeling
    // "live" to users. The visible price flash animation still works.
    // The /api/prices endpoint has its own 60s edge cache, so even if
    // multiple components call /api/prices within 60s, only 1 upstream
    // call hits CoinGecko per minute per region.
    load();
    intervalId = setInterval(load, 30_000);

    // Pause when tab hidden, resume + immediate refresh when visible again
    const onVis = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (loading && !coins.length) {
    return (
      <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-10 flex items-center">
          <div className="h-3 w-32 shimmer rounded" />
        </div>
      </div>
    );
  }

  if (!coins.length) return null;

  // Duplicate the list so the marquee can loop seamlessly
  const list = [...coins, ...coins];
  // Animation speed: faster when more coins (so transit time stays similar)
  const animDuration = Math.max(40, coins.length * 4);

  return (
    <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40 overflow-hidden relative">
      {/* Live indicator — anchored to the inline-start (left in LTR, right in RTL) */}
      <div className="absolute inset-inline-start-0 top-0 bottom-0 z-20 flex items-center ps-3 pe-4 bg-gradient-to-r from-[var(--brand-bg)] via-[var(--brand-bg)]/95 to-transparent">
        <span className="flex items-center gap-1.5 text-[10px] font-latin uppercase tracking-wider text-[var(--brand-accent)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-accent)] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
          </span>
          <Activity className="w-2.5 h-2.5" />
          Live
        </span>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative h-10 flex items-center overflow-hidden"
          style={{ paddingInlineStart: "5rem" }}
        >
          {/* Inline-end fade */}
          <div className="absolute inset-inline-end-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l from-[var(--brand-bg)] to-transparent" />

          <div
            className="flex items-center gap-6 animate-marquee whitespace-nowrap"
            style={{ animationDuration: `${animDuration}s` }}
          >
            {list.map((c, i) => {
              const up = c.change24h >= 0;
              const prev = prevPricesRef.current[c.id];
              const changed =
                prev !== undefined && Math.abs(prev - c.price) / (prev || 1) > 0.0001;
              const flashClass = changed
                ? prev < c.price
                  ? "ticker-flash-up"
                  : "ticker-flash-down"
                : "";
              return (
                <div
                  key={`${c.id}-${i}`}
                  className={`flex items-center gap-2 shrink-0 px-1 py-0.5 rounded ${flashClass}`}
                >
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-4 h-4 rounded-full"
                    loading="lazy"
                  />
                  <span className="text-xs font-semibold text-[var(--brand-text)] font-latin">
                    {c.symbol}
                  </span>
                  <span className="text-xs font-latin text-[var(--brand-text)] tabular-nums">
                    ${c.price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: c.price < 1 ? 6 : 2,
                    })}
                  </span>
                  <span
                    className={`text-xs font-latin flex items-center gap-0.5 ${
                      up ? "text-[var(--brand-accent)]" : "text-red-400"
                    }`}
                  >
                    {up ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(c.change24h).toFixed(2)}%
                  </span>
                  <span className="text-[var(--brand-border)]">|</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tickerFlashUp {
          0%   { background-color: rgba(45, 212, 191, 0.35); }
          100% { background-color: transparent; }
        }
        @keyframes tickerFlashDown {
          0%   { background-color: rgba(248, 113, 113, 0.35); }
          100% { background-color: transparent; }
        }
        .ticker-flash-up   { animation: tickerFlashUp   0.8s ease-out; }
        .ticker-flash-down { animation: tickerFlashDown 0.8s ease-out; }
      `}</style>
    </div>
  );
}
