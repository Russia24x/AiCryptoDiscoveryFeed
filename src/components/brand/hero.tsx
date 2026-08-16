"use client";

import { Sparkles, ArrowLeft, Activity, Globe2, Zap } from "lucide-react";
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
      {/* Primary teal glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[680px] bg-glow-teal pointer-events-none" />
      {/* Secondary smaller glow */}
      <div
        className="absolute top-1/3 -left-24 w-[300px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.10), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-32 -right-24 w-[420px] h-[420px] pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(167,139,250,0.08), transparent 70%)",
        }}
      />

      {/* Floating decorative dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="absolute top-12 right-[8%] w-1 h-1 rounded-full bg-[var(--brand-accent)]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.2, delay: 0.6 }}
        className="absolute top-32 left-[12%] w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.4, delay: 0.8 }}
        className="absolute bottom-24 right-[20%] w-1 h-1 rounded-full bg-[var(--brand-accent)]"
      />

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
            <span className="relative ml-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-accent)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-accent)]" />
            </span>
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

          {/* Stat row — reimagined as glowing cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-xl mt-2"
          >
            <StatCard
              label="محتوای زنده"
              value={totalItems.toLocaleString("fa-IR")}
              icon={<Activity className="w-4 h-4" />}
              accent="#2dd4bf"
            />
            <StatCard
              label="منابع فعال"
              value={`${sourcesOk.toLocaleString("fa-IR")}/${sourcesTried.toLocaleString("fa-IR")}`}
              icon={<Globe2 className="w-4 h-4" />}
              accent="#38bdf8"
            />
            <StatCard
              label="حوزه تخصصی"
              value="۵ حوزه"
              icon={<Zap className="w-4 h-4" />}
              accent="#a78bfa"
            />
          </motion.div>

          {/* CTA */}
          <motion.a
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            href="#feed"
            className="group relative inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full bg-[var(--brand-accent)] text-[#04201d] text-sm font-bold hover:brightness-110 transition-all overflow-hidden"
          >
            {/* Shimmer overlay on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <span className="relative">مشاهده فید زنده</span>
            <ArrowLeft className="w-4 h-4 relative transition-transform group-hover:-translate-x-1" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="relative rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)]/60 backdrop-blur-sm p-3 md:p-4 overflow-hidden">
      {/* Accent edge */}
      <div
        className="absolute top-0 right-0 w-px h-full"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
        }}
      />
      <div className="flex items-center gap-1.5 text-[var(--brand-muted)] text-[11px] mb-1.5">
        <span style={{ color: accent }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        className="text-2xl md:text-3xl font-bold font-latin tabular-nums"
        style={{ color: "var(--brand-text)" }}
      >
        {value}
      </div>
    </div>
  );
}
