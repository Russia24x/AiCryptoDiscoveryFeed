"use client";

import { Sparkles, ArrowLeft, Activity, Globe2 } from "lucide-react";
import { motion } from "framer-motion";

interface HeroProps {
  totalItems: number;
  sourcesOk: number;
  sourcesTried: number;
}

export function Hero({ totalItems, sourcesOk, sourcesTried }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--brand-border)]">
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] bg-glow-teal pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/20 text-xs font-latin tracking-wide text-[var(--brand-accent)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="uppercase tracking-[0.2em]">Discovery Engine · Live</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight max-w-3xl"
          >
            <span className="text-[var(--brand-text)]">آینده را </span>
            <span className="text-[var(--brand-accent)]">کشف کن</span>
            <span className="text-[var(--brand-text)]">، نه فقط دنبالش برو.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-base md:text-lg text-[var(--brand-muted)] max-w-2xl leading-relaxed"
          >
            یک پلتفرم داده‌محور برای گردآوری هوشمند محتوای ارز دیجیتال، هوش مصنوعی،
            فناوری و بازی‌های ویدیویی. منابع خبری، کانال‌های تلگرام و توییتر را در یک
            داشبورد مینیمال و خوانا متمرکز کنید — بدون دیتابیس، روی زیرساخت رایگان کلادفلر.
          </motion.p>

          {/* Stat row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-3 gap-4 md:gap-8 w-full max-w-xl mt-2"
          >
            <Stat
              label="محتوای زنده"
              value={totalItems.toLocaleString("fa-IR")}
              icon={<Activity className="w-4 h-4" />}
            />
            <Stat
              label="منابع فعال"
              value={`${sourcesOk}/${sourcesTried}`.replace(/\d/g, (d) =>
                "۰۱۲۳۴۵۶۷۸۹"[Number(d)]
              )}
              icon={<Globe2 className="w-4 h-4" />}
            />
            <Stat
              label="حوزه تخصصی"
              value="۵ حوزه"
              icon={<Sparkles className="w-4 h-4" />}
            />
          </motion.div>

          {/* CTA */}
          <motion.a
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            href="#feed"
            className="group inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-sm font-bold hover:brightness-110 transition-all"
          >
            مشاهده فید زنده
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[var(--brand-muted)] text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-[var(--brand-text)] font-latin tabular-nums">
        {value}
      </div>
    </div>
  );
}
