"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * usePriceAlerts — localStorage-backed price alert system.
 *
 * Users can set price alerts for coins. When the price crosses the
 * threshold, a browser notification is shown (via the Notification API).
 *
 * Alerts are checked client-side using TanStack Query's cached data —
 * no extra API calls are made. The alerts are evaluated every time
 * the cached price data updates (via useQuery's onSuccess or by
 * polling the query cache).
 *
 * Stored in localStorage under key "acd:price-alerts" as JSON array:
 *   [{
 *     coinId: "bitcoin",
 *     symbol: "BTC",
 *     name: "Bitcoin",
 *     direction: "above" | "below",
 *     targetPrice: 70000,
 *     currentPrice: 64500,
 *     active: true,
 *     createdAt: "2026-...",
 *     triggered: false
 *   }]
 *
 * Max 20 alerts.
 */

const STORAGE_KEY = "acd:price-alerts";
const MAX_ALERTS = 20;

export type AlertDirection = "above" | "below";

export interface PriceAlert {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  direction: AlertDirection;
  targetPrice: number;
  currentPrice?: number;
  active: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

function readStorage(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a: PriceAlert) => a && a.id && a.coinId);
  } catch {
    return [];
  }
}

function writeStorage(alerts: PriceAlert[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    window.dispatchEvent(new CustomEvent("acd:price-alerts-changed"));
  } catch {
    // ignore
  }
}

/** Generate a unique ID for a new alert. */
function genId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Hydrate from localStorage + check notification permission
  useEffect(() => {
    const id = window.setTimeout(() => {
      setAlerts(readStorage());
      setHydrated(true);
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    }, 0);

    const onChange = () => setAlerts(readStorage());
    window.addEventListener("storage", onChange);
    window.addEventListener("acd:price-alerts-changed", onChange as EventListener);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("acd:price-alerts-changed", onChange as EventListener);
    };
  }, []);

  /** Request notification permission from the user. */
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  /** Add a new price alert. Returns false if max reached or duplicate. */
  const addAlert = useCallback(
    (alert: Omit<PriceAlert, "id" | "createdAt" | "active" | "triggered">) => {
      const current = readStorage();
      if (current.length >= MAX_ALERTS) return false;
      // Check for duplicate (same coinId + direction + targetPrice)
      const isDup = current.some(
        (a) =>
          a.coinId === alert.coinId &&
          a.direction === alert.direction &&
          Math.abs(a.targetPrice - alert.targetPrice) / alert.targetPrice < 0.001
      );
      if (isDup) return false;

      const newAlert: PriceAlert = {
        ...alert,
        id: genId(),
        active: true,
        triggered: false,
        createdAt: new Date().toISOString(),
      };
      const next = [newAlert, ...current];
      writeStorage(next);
      setAlerts(next);
      return true;
    },
    []
  );

  /** Remove an alert by ID. */
  const removeAlert = useCallback((id: string) => {
    const next = readStorage().filter((a) => a.id !== id);
    writeStorage(next);
    setAlerts(next);
  }, []);

  /** Toggle alert active state. */
  const toggleAlert = useCallback((id: string) => {
    const next = readStorage().map((a) =>
      a.id === id ? { ...a, active: !a.active, triggered: false } : a
    );
    writeStorage(next);
    setAlerts(next);
  }, []);

  /** Clear all alerts. */
  const clearAll = useCallback(() => {
    writeStorage([]);
    setAlerts([]);
  }, []);

  /**
   * Check alerts against current prices. Called by the UI whenever
   * TanStack Query receives fresh price data.
   *
   * For each active, non-triggered alert:
   *   - If direction="above" and currentPrice >= targetPrice → trigger
   *   - If direction="below" and currentPrice <= targetPrice → trigger
   *
   * When triggered:
   *   - Mark alert as triggered (won't fire again until reset)
   *   - Show a browser notification (if permission granted)
   *   - Update localStorage
   *
   * Returns the list of alerts that were triggered in this check.
   */
  const checkAlerts = useCallback(
    (prices: Record<string, { price: number; symbol: string; name: string }>) => {
      const current = readStorage();
      if (current.length === 0) return [];

      const triggered: PriceAlert[] = [];
      const updated = current.map((alert) => {
        if (!alert.active || alert.triggered) return alert;
        const coinData = prices[alert.coinId];
        if (!coinData) return alert;
        const { price } = coinData;
        const shouldTrigger =
          (alert.direction === "above" && price >= alert.targetPrice) ||
          (alert.direction === "below" && price <= alert.targetPrice);

        if (shouldTrigger) {
          const triggeredAlert: PriceAlert = {
            ...alert,
            triggered: true,
            triggeredAt: new Date().toISOString(),
            currentPrice: price,
          };
          triggered.push(triggeredAlert);

          // Show notification
          if ("Notification" in window && Notification.permission === "granted") {
            const directionText = alert.direction === "above" ? "بالاتر از" : "پایین‌تر از";
            const icon = alert.direction === "above" ? "📈" : "📉";
            try {
              new Notification(`${icon} ${alert.symbol} — هشدار قیمت`, {
                body: `${alert.name} اکنون ${directionText} $${alert.targetPrice.toLocaleString("en-US")} است (قیمت فعلی: $${price.toLocaleString("en-US")})`,
                tag: alert.id,
                icon: "/icon-192.png",
              });
            } catch {
              // Notification might fail in some browsers
            }
          }
          return triggeredAlert;
        }
        // Update currentPrice on the alert
        return { ...alert, currentPrice: price };
      });

      if (triggered.length > 0) {
        writeStorage(updated);
        setAlerts(updated);
      }

      return triggered;
    },
    []
  );

  return {
    alerts,
    count: alerts.length,
    hydrated,
    permission,
    requestPermission,
    addAlert,
    removeAlert,
    toggleAlert,
    clearAll,
    checkAlerts,
  };
}
