"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
}

export function Ticker() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/prices", { next: { revalidate: 60 } });
        const data = await res.json();
        if (!cancelled && data?.coins?.length) {
          setCoins(data.coins);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
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

  return (
    <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/40 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative h-10 flex items-center overflow-hidden">
          {/* Right-edge fade */}
          <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l from-[var(--brand-bg)] to-transparent" />
          <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r from-[var(--brand-bg)] to-transparent" />

          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {list.map((c, i) => {
              const up = c.change24h >= 0;
              return (
                <div key={`${c.id}-${i}`} className="flex items-center gap-2 shrink-0">
                  <img src={c.image} alt={c.name} className="w-4 h-4 rounded-full" />
                  <span className="text-xs font-semibold text-[var(--brand-text)] font-latin">
                    {c.symbol}
                  </span>
                  <span className="text-xs font-latin text-[var(--brand-text)]">
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
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(c.change24h).toFixed(2)}%
                  </span>
                  <span className="text-[var(--brand-border)]">|</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
