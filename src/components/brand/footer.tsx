"use client";

import { Logo } from "@/components/brand/logo";
import {
  SOURCES,
  CATEGORY_META,
  categoryLabel,
  type Category,
} from "@/lib/sources";
import { useLanguage } from "@/hooks/use-language";

export function Footer() {
  const { t, lang } = useLanguage();
  const year = new Date().getFullYear().toLocaleString("en-US");

  return (
    <footer className="mt-auto border-t border-[var(--brand-border)] bg-[var(--brand-bg)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Logo size="md" showSub lang={lang} />
            <p className="mt-4 text-sm text-[var(--brand-muted)] leading-relaxed max-w-md">
              {lang === "fa"
                ? "پلتفرم کشف هوشمند محتوای آینده‌نگرانه در حوزه‌های ارز دیجیتال، هوش مصنوعی، فناوری و بازی‌های ویدیویی. داده‌محور، مینیمال، بدون دیتابیس."
                : "A data-driven platform for forward-looking content across crypto, AI, tech, and gaming. Minimal, no database, on free Cloudflare infra."}
            </p>
            <div className="mt-4 flex items-center gap-3 text-xs text-[var(--brand-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-accent)] animate-pulse" />
                <span className="font-latin">{t.footer.status}</span>
              </span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">
              {t.footer.categories}
            </h4>
            <ul className="space-y-2">
              {Object.entries(CATEGORY_META).map(([key, _m]) => {
                const k = key as Exclude<Category, "all">;
                return (
                  <li key={key}>
                    <a
                      href={`/?category=${k}#feed`}
                      className="text-sm text-[var(--brand-text)] hover:text-[var(--brand-accent)] transition-colors"
                    >
                      {categoryLabel(k, lang)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sources */}
          <div>
            <h4 className="text-xs font-latin uppercase tracking-wider text-[var(--brand-muted)] mb-3">
              {t.footer.topSources}
            </h4>
            <ul className="space-y-2">
              {SOURCES.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--brand-text)] hover:text-[var(--brand-accent)] transition-colors font-latin"
                  >
                    {lang === "fa" ? s.nameFa : s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--brand-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-[var(--brand-muted)]">
          <span className="font-latin">
            © {year} Ai Crypto Discovery —{" "}
            {lang === "fa"
              ? "ساخته‌شده برای وب غیرمتمرکز"
              : "Built for the decentralized web"}
          </span>
          <span className="font-latin text-[var(--brand-muted)]/70">
            {t.footer.hosting}
          </span>
        </div>
      </div>
    </footer>
  );
}
