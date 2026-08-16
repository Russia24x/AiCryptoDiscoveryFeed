"use client";

import { Telescope, Brain, Cpu, Bitcoin, Gamepad2, Rocket } from "lucide-react";

const PILLARS = [
  {
    icon: Bitcoin,
    title: "اقتصاد رمزنگاری‌شده",
    titleEn: "Tokenized Economy",
    text: "گذار از پول فیات به دارایی‌های رمزنگاری‌شده، قراردادهای هوشمند و مالکیت غیرمتمرکز داده‌ها. آینده‌ای که در آن هر دارایی قابل انتقال، روی زنجیره قابل اعتبارسنجی خواهد بود.",
    accent: "#f7931a",
  },
  {
    icon: Brain,
    title: "هوش مصنوعی عامل‌محور",
    titleEn: "Agentic AI",
    text: "گذار از مدل‌های زبانی پاسخگو به عامل‌های خودمختار که وظایف چندمرحله‌ای را مستقل انجام می‌دهند. این عامل‌ها با یکدیگر و با ابزارهای خارجی مذاکره خواهند کرد.",
    accent: "#2dd4bf",
  },
  {
    icon: Cpu,
    title: "رایانش لبه‌ای",
    titleEn: "Edge Compute",
    text: "پردازش داده نزدیک‌تر به کاربر نهایی. با ترکیب 5G و تراشه‌های تخصصی AI، تأخیر برنامه‌ها به زیر ۱۰ میلی‌ثانیه کاهش می‌یابد و تجربه‌های واقعیت افزوده قابل‌اعتماد می‌شوند.",
    accent: "#38bdf8",
  },
  {
    icon: Gamepad2,
    title: "بازی‌های تحت وب ۳",
    titleEn: "Web3 Gaming",
    text: "مالکیت واقعی آیتم‌های داخل بازی توسط بازیکن، اقتصادهای شفاف و بازی‌های کراس‌پلتفرم. آینده‌ای که در آن زمان صرف‌شده در بازی به دارایی تبدیل می‌شود.",
    accent: "#a78bfa",
  },
  {
    icon: Telescope,
    title: "آینده‌شناسی سیستماتیک",
    titleEn: "Foresight",
    text: "تحلیل سناریوهای چندگانه برای ۱۰ تا ۲۰ سال آینده. تمرکز بر روندهای ضعیف اما با‌تأثیرگذاری بالا، نه فقط پیش‌بینی‌های خطی.",
    accent: "#f59e0b",
  },
  {
    icon: Rocket,
    title: "همگرایی فناوری‌ها",
    titleEn: "Convergence",
    text: "نقطه‌ای که در آن هوش مصنوعی، رمزنگاری و رایانش لبه همگرا می‌شوند و محصولاتی ایجاد می‌کنند که امروز قابل تصور نیستند — مثل عامل‌های مالی خودکار روی زنجیره.",
    accent: "#ec4899",
  },
];

export function FutureVision() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--brand-border)] bg-[var(--brand-surface)]/30">
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-96 h-96 bg-glow-teal opacity-60 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/20 text-xs font-latin tracking-wide text-[var(--brand-accent)] mb-4">
            <Telescope className="w-3.5 h-3.5" />
            <span className="uppercase tracking-[0.2em]">Future Vision</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold leading-tight">
            <span className="text-[var(--brand-text)]">شش محور </span>
            <span className="text-[var(--brand-accent)]">آینده‌نگرانه</span>
            <span className="text-[var(--brand-text)]"> که پلتفرم را هدایت می‌کنند</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-[var(--brand-muted)] leading-relaxed">
            محتوای گردآوری‌شده روی Ai Crypto Discovery بر اساس این شش محور فیلتر و
            اولویت‌بندی می‌شود. این چارچوب تضمین می‌کند که هر محتوا به جای تکرار اخبار
            روزمره، به سمت درک روندهای ساختاری و آینده‌نگرانه حرکت کند.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <article
                key={p.titleEn}
                className="card-lift group relative rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${p.accent}1a`,
                      color: p.accent,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--brand-text)]">
                      {p.title}
                    </h3>
                    <span className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
                      {p.titleEn}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-[var(--brand-muted)] leading-relaxed">
                  {p.text}
                </p>
                {/* Accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: p.accent }}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
