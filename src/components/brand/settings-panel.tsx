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

/* City list — synced with /api/weather POPULAR_CITIES */
const CITIES: Array<{ id: string; nameFa: string; nameEn: string; lat: number; lon: number }> = [
  { id: "tehran",     nameFa: "تهران",     nameEn: "Tehran",     lat: 35.6892,  lon: 51.3890 },
  { id: "mashhad",    nameFa: "مشهد",      nameEn: "Mashhad",    lat: 36.2605,  lon: 59.6168 },
  { id: "isfahan",    nameFa: "اصفهان",    nameEn: "Isfahan",    lat: 32.6539,  lon: 51.6660 },
  { id: "shiraz",     nameFa: "شیراز",     nameEn: "Shiraz",     lat: 29.5918,  lon: 52.5837 },
  { id: "tabriz",     nameFa: "تبریز",     nameEn: "Tabriz",     lat: 38.0800,  lon: 46.2919 },
  { id: "ahvaz",      nameFa: "اهواز",     nameEn: "Ahvaz",      lat: 31.3183,  lon: 48.6706 },
  { id: "kermanshah", nameFa: "کرمانشاه",   nameEn: "Kermanshah", lat: 34.3142,  lon: 47.0650 },
  { id: "rasht",      nameFa: "رشت",       nameEn: "Rasht",      lat: 37.2808,  lon: 49.5832 },
  { id: "kerman",     nameFa: "کرمان",     nameEn: "Kerman",     lat: 30.2839,  lon: 57.0834 },
  { id: "dubai",      nameFa: "دبی",       nameEn: "Dubai",      lat: 25.2048,  lon: 55.2708 },
  { id: "istanbul",   nameFa: "استانبول",   nameEn: "Istanbul",   lat: 41.0082,  lon: 28.9784 },
  { id: "london",     nameFa: "لندن",      nameEn: "London",     lat: 51.5074,  lon: -0.1278 },
  { id: "newyork",    nameFa: "نیویورک",   nameEn: "New York",   lat: 40.7128,  lon: -74.0060 },
  { id: "tokyo",      nameFa: "توکیو",     nameEn: "Tokyo",      lat: 35.6762,  lon: 139.6503 },
];

const WEATHER_KEY = "acd:weather-city";

function readCity(): string {
  if (typeof window === "undefined") return "tehran";
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.id) return p.id;
    }
  } catch {
    // ignore
  }
  return "tehran";
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t, lang, setLanguage } = useLanguage();
  const { mode: themeMode, setTheme, label: themeLabel } = useTheme();
  const [cityId, setCityId] = useState("tehran");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setCityId(readCity());
      setSearch("");
    }
  }, [open]);

  const filtered = CITIES.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.nameEn.toLowerCase().includes(q) ||
      c.nameFa.includes(search)
    );
  });

  const onPickCity = useCallback(
    (city: (typeof CITIES)[number]) => {
      try {
        const obj = { id: city.id, nameFa: city.nameFa, nameEn: city.nameEn, lat: city.lat, lon: city.lon };
        localStorage.setItem(WEATHER_KEY, JSON.stringify(obj));
        window.dispatchEvent(new CustomEvent("acd:weather-city-changed", { detail: obj }));
        toast.success(
          lang === "fa"
            ? `شهر آب‌وهوا روی «${city.nameFa}» تنظیم شد`
            : `Weather city set to ${city.nameEn}`,
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
        className="w-full sm:w-[440px] bg-[var(--brand-surface)] border-l border-[var(--brand-border)] p-0 overflow-y-auto"
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

          {/* Weather city section */}
          <Section
            title={lang === "fa" ? "شهر برای آب‌وهوا" : "Weather city"}
            icon={<MapPin className="w-3.5 h-3.5" />}
            accent="#38bdf8"
          >
            <div className="relative mb-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--brand-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی شهر…" : "Search city…"}
                className="w-full bg-[var(--brand-surface-2)] border border-[var(--brand-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto [scrollbar-width:thin]">
              {filtered.map((city) => (
                <button
                  key={city.id}
                  onClick={() => onPickCity(city)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    cityId === city.id
                      ? "bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)] text-[var(--brand-accent)]"
                      : "bg-[var(--brand-surface-2)] border border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/30"
                  )}
                >
                  <span className="truncate">{lang === "fa" ? city.nameFa : city.nameEn}</span>
                  {cityId === city.id && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--brand-muted)] mt-2">
              {lang === "fa"
                ? "تنظیمات شهر در localStorage مرورگر شما ذخیره می‌شود."
                : "Your city preference is saved to localStorage."}
            </p>
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
                Ai Crypto Discovery · v1.1 · No-DB · Cloudflare-ready
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
          : "bg-[var(--brand-surface-2)] border-[var(--brand-border)] text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:border-[var(--brand-accent)]/40"
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
