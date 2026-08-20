"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon,
  X,
  Moon,
  Sun,
  Monitor,
  MapPin,
  Search as SearchIcon,
  Check,
  Type,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WEATHER_KEY = "acd:weather-city";

interface StoredCity {
  id: string | number;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

interface GeoCity extends StoredCity {
  countryCode: string;
  admin1: string;
  displayName: string;
  population: number;
}

const DEFAULT_CITY: StoredCity = {
  id: "tehran-default",
  name: "Tehran",
  country: "Iran",
  lat: 35.6892,
  lon: 51.3890,
};

function readCity(): StoredCity {
  if (typeof window === "undefined") return DEFAULT_CITY;
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.lat === "number" && typeof p.lon === "number") {
        return p;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CITY;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t, lang, setLanguage } = useLanguage();
  const { mode: themeMode, setTheme, label: themeLabel } = useTheme();
  const [currentCity, setCurrentCity] = useState<StoredCity>(DEFAULT_CITY);
  const [search, setSearch] = useState("");
  const [geoResults, setGeoResults] = useState<GeoCity[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentCity(readCity());
      setSearch("");
      setGeoResults([]);
    }
  }, [open]);

  // Debounced search via the geocode API.
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setGeoResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/weather/geocode?q=${encodeURIComponent(search.trim())}&language=${lang}`
        );
        if (!res.ok) {
          setGeoResults([]);
          return;
        }
        const json = await res.json();
        setGeoResults(json?.cities || []);
      } catch {
        setGeoResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [search, lang]);

  const onPickCity = useCallback(
    (city: GeoCity) => {
      const obj: StoredCity = {
        id: city.id,
        name: city.name,
        country: city.country,
        lat: city.lat,
        lon: city.lon,
      };
      try {
        localStorage.setItem(WEATHER_KEY, JSON.stringify(obj));
        // Event name is `${WEATHER_KEY}-changed` = "acd:weather-city-changed".
        // This matches useLocalStorage's subscribeFn convention (which
        // listens for `${key}-changed` where key already includes "acd:").
        window.dispatchEvent(new CustomEvent(`${WEATHER_KEY}-changed`, { detail: obj }));
        setCurrentCity(obj);
        toast.success(
          lang === "fa"
            ? `شهر آب‌وهوا روی «${city.displayName}» تنظیم شد`
            : `Weather city set to ${city.displayName}`,
          { duration: 2500 }
        );
      } catch {
        // ignore
      }
    },
    [lang]
  );

  const onThemeChange = useCallback(
    (next: ThemeMode) => {
      setTheme(next);
      const msg =
        next === "dark"
          ? lang === "fa" ? "حالت تیره فعال شد" : "Dark mode enabled"
          : next === "light"
          ? lang === "fa" ? "حالت روشن فعال شد" : "Light mode enabled"
          : lang === "fa" ? "حالت سیستمی فعال شد" : "System mode enabled";
      toast.success(msg, { duration: 2000 });
    },
    [setTheme, lang]
  );

  const onLangChange = useCallback(
    (next: "fa" | "en") => {
      setLanguage(next);
      toast.success(
        next === "fa" ? "زبان روی فارسی تنظیم شد" : "Language set to English",
        { duration: 2000 }
      );
    },
    [setLanguage]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={lang === "fa" ? "right" : "left"}
        className="w-full sm:w-[440px] bg-[var(--brand-surface)] border-s border-[var(--brand-border)] p-0 overflow-y-auto"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--brand-border)] sticky top-0 bg-[var(--brand-surface)] z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[var(--brand-accent)]" />
              <span>{lang === "fa" ? "تنظیمات" : "Settings"}</span>
            </SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-[var(--brand-surface-2)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors"
              aria-label={t.common.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="p-5 space-y-6">
          {/* Language section */}
          <Section
            title={lang === "fa" ? "زبان" : "Language"}
            icon={<Type className="w-3.5 h-3.5" />}
            accent="#2dd4bf"
          >
            <div className="grid grid-cols-2 gap-2">
              <ToggleCard
                active={lang === "fa"}
                onClick={() => onLangChange("fa")}
                label="فارسی"
                sublabel="Persian · RTL"
              />
              <ToggleCard
                active={lang === "en"}
                onClick={() => onLangChange("en")}
                label="English"
                sublabel="LTR"
              />
            </div>
          </Section>

          {/* Theme section */}
          <Section
            title={lang === "fa" ? "حالت نمایش" : "Theme"}
            icon={<Sun className="w-3.5 h-3.5" />}
            accent="#f59e0b"
          >
            <div className="grid grid-cols-3 gap-2">
              <ToggleCard
                active={themeMode === "dark"}
                onClick={() => onThemeChange("dark")}
                label={lang === "fa" ? "تیره" : "Dark"}
                icon={<Moon className="w-4 h-4" />}
              />
              <ToggleCard
                active={themeMode === "light"}
                onClick={() => onThemeChange("light")}
                label={lang === "fa" ? "روشن" : "Light"}
                icon={<Sun className="w-4 h-4" />}
              />
              <ToggleCard
                active={themeMode === "system"}
                onClick={() => onThemeChange("system")}
                label={lang === "fa" ? "سیستمی" : "System"}
                icon={<Monitor className="w-4 h-4" />}
              />
            </div>
            <p className="text-[11px] text-[var(--brand-muted)] mt-2">
              {lang === "fa"
                ? `انتخاب فعلی: ${themeLabel("fa")} · در حالت «سیستمی» از ترجیح سیستم‌عامل شما پیروی می‌شود.`
                : `Current: ${themeLabel("en")} · In "System" mode it follows your OS preference.`}
            </p>
          </Section>

          {/* Weather city section — now with real geocoding search */}
          <Section
            title={lang === "fa" ? "شهر برای آب‌وهوا" : "Weather city"}
            icon={<MapPin className="w-3.5 h-3.5" />}
            accent="#38bdf8"
          >
            {/* Current city indicator */}
            <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/30 text-xs">
              <span className="text-[var(--brand-muted)]">
                {lang === "fa" ? "شهر فعلی: " : "Current: "}
              </span>
              <span className="font-bold text-[var(--brand-text)]">
                {currentCity.name}
                {currentCity.country ? `, ${currentCity.country}` : ""}
              </span>
            </div>

            <div className="relative mb-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--brand-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی شهر… (مثلاً bangkok)" : "Search city… (e.g. bangkok)"}
                className="w-full bg-[var(--brand-surface-2)] border border-[var(--brand-border)] rounded-lg pl-9 pr-9 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)]"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[var(--brand-accent)]" />
              )}
            </div>

            {/* Search results */}
            {search.trim().length >= 2 ? (
              <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto [scrollbar-width:thin]">
                {geoResults.length === 0 && !searching ? (
                  <p className="text-[11px] text-[var(--brand-muted)] text-center py-4">
                    {lang === "fa"
                      ? "شهری یافت نشد. امتحان کنید: تهران، bangkok، istanbul…"
                      : "No cities found. Try: tehran, bangkok, istanbul…"}
                  </p>
                ) : (
                  geoResults.map((city) => (
                    <button
                      key={`${city.id}-${city.lat}-${city.lon}`}
                      onClick={() => onPickCity(city)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[var(--brand-text)] truncate">
                          {city.displayName}
                        </div>
                        <div className="text-[9px] text-[var(--brand-muted)] font-latin">
                          {city.lat.toFixed(2)}, {city.lon.toFixed(2)}
                          {city.population > 0 && (
                            <span className="ms-1 opacity-60">
                              · pop {(city.population / 1000).toFixed(0)}k
                            </span>
                          )}
                        </div>
                      </div>
                      {currentCity.lat === city.lat && currentCity.lon === city.lon && (
                        <Check className="w-3 h-3 shrink-0 text-[var(--brand-accent)]" />
                      )}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--brand-muted)] mt-2">
                {lang === "fa"
                  ? "برای جستجوی شهر نامش را تایپ کنید (حداقل ۲ حرف). جستجو در سراسر جهان کار می‌کند."
                  : "Type a city name to search (min 2 chars). Search works worldwide."}
              </p>
            )}
          </Section>

          {/* About / privacy */}
          <Section
            title={lang === "fa" ? "درباره و حریم خصوصی" : "About & privacy"}
            icon={<SettingsIcon className="w-3.5 h-3.5" />}
            accent="#a78bfa"
          >
            <div className="space-y-2 text-[11px] text-[var(--brand-muted)] leading-relaxed">
              <p>
                {lang === "fa"
                  ? "تمام تنظیمات شما به‌صورت محلی در مرورگر ذخیره می‌شود. هیچ داده‌ای به سرور ارسال نمی‌شود."
                  : "All your settings are stored locally in your browser. No data is sent to the server."}
              </p>
              <p className="font-latin text-[var(--brand-muted)]/80">
                Ai Crypto Discovery · v1.3 · No-DB · Cloudflare-ready
              </p>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: accent }}>{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider font-latin text-[var(--brand-text)]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ToggleCard({
  active,
  onClick,
  label,
  sublabel,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg border text-xs font-semibold transition-all",
        active
          ? "bg-[var(--brand-accent-soft)] border-[var(--brand-accent)] text-[var(--brand-accent)]"
          : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40"
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      {sublabel && (
        <span className="text-[9px] font-latin opacity-60">{sublabel}</span>
      )}
    </button>
  );
}
