"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Global UI store — UI state shared across components.
 *
 * Why Zustand:
 *   - Single source of truth for UI state that multiple components need
 *     (active modals, sidebar visibility, theme-related UI flags).
 *   - Persists to localStorage so state survives page reloads.
 *   - Much simpler than Redux; no boilerplate.
 *
 * What goes here:
 *   - UI state (active modals, drawers, panels)
 *   - User preferences (sort order, filter state)
 *   - Cross-component coordination flags
 *
 * What does NOT go here:
 *   - Server data (use TanStack Query for that)
 *   - Local component state (useState is fine)
 *   - Anything that needs to be reactive to external changes (use useSyncExternalStore)
 */

interface UIState {
  // === Navigation ===
  /** Currently active settings tab (for SettingsPanel). */
  activeSettingsTab: "general" | "appearance" | "data" | "notifications";
  setActiveSettingsTab: (tab: UIState["activeSettingsTab"]) => void;

  // === Market page preferences ===
  /** Default sort field for market table. */
  marketSortField: "market_cap_rank" | "current_price" | "price_change_percentage_24h" | "total_volume" | "market_cap" | "price_change_percentage_30d_in_currency";
  marketSortDir: "asc" | "desc";
  setMarketSort: (field: UIState["marketSortField"], dir: UIState["marketSortDir"]) => void;

  /** Active category tag filter on market page. */
  marketActiveTag: string | null;
  setMarketActiveTag: (tag: string | null) => void;

  /** Show only watchlist coins in market table. */
  marketShowWatchlistOnly: boolean;
  setMarketShowWatchlistOnly: (show: boolean) => void;

  /** View mode for market table: "table" (rows) or "grid" (cards). */
  marketViewMode: "table" | "grid";
  setMarketViewMode: (mode: UIState["marketViewMode"]) => void;

  // === Coin detail page preferences ===
  /** Default time range for price charts (days). */
  chartTimeRange: 1 | 7 | 30 | 90 | 365;
  setChartTimeRange: (range: UIState["chartTimeRange"]) => void;

  // === Notifications ===
  /** Whether price alert notifications are enabled (browser notifications). */
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // === Navigation ===
      activeSettingsTab: "general",
      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),

      // === Market page preferences ===
      marketSortField: "market_cap_rank",
      marketSortDir: "asc",
      setMarketSort: (field, dir) =>
        set({ marketSortField: field, marketSortDir: dir }),

      marketActiveTag: null,
      setMarketActiveTag: (tag) => set({ marketActiveTag: tag }),

      marketShowWatchlistOnly: false,
      setMarketShowWatchlistOnly: (show) =>
        set({ marketShowWatchlistOnly: show }),

      marketViewMode: "table",
      setMarketViewMode: (mode) => set({ marketViewMode: mode }),

      // === Coin detail page preferences ===
      chartTimeRange: 7,
      setChartTimeRange: (range) => set({ chartTimeRange: range }),

      // === Notifications ===
      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),
    }),
    {
      name: "acd:ui-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not transient UI state
      partialize: (state) => ({
        marketSortField: state.marketSortField,
        marketSortDir: state.marketSortDir,
        marketActiveTag: state.marketActiveTag,
        marketShowWatchlistOnly: state.marketShowWatchlistOnly,
        marketViewMode: state.marketViewMode,
        chartTimeRange: state.chartTimeRange,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);
