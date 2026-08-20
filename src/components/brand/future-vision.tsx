"use client";

import { Telescope, Brain, Cpu, Bitcoin, Gamepad2, Rocket, Film } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const PILLARS = [
  {
    icon: Bitcoin,
    titleKey: "tokenizedEconomy",
    accent: "#f7931a",
  },
  {
    icon: Brain,
    titleKey: "agenticAI",
    accent: "#2dd4bf",
  },
  {
    icon: Cpu,
    titleKey: "edgeCompute",
    accent: "#38bdf8",
  },
  {
    icon: Gamepad2,
    titleKey: "web3Gaming",
    accent: "#a78bfa",
  },
  {
    icon: Telescope,
    titleKey: "foresight",
    accent: "#f59e0b",
  },
  {
    icon: Rocket,
    titleKey: "convergence",
    accent: "#ec4899",
  },
] as const;

export function FutureVision() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden border-y border-[var(--brand-border)] bg-[var(--brand-surface)]/30">
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-96 h-96 bg-glow-teal opacity-60 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/20 text-xs font-latin tracking-wide text-[var(--brand-accent)] mb-4">
            <Telescope className="w-3.5 h-3.5" />
            <span className="uppercase tracking-[0.2em]">
              {t.futureVision.badge}
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold leading-tight">
            <span className="text-[var(--brand-text)]">{t.futureVision.title} </span>
            <span className="text-[var(--brand-accent)]">
              {t.futureVision.titleAccent}
            </span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-[var(--brand-muted)] leading-relaxed">
            {t.futureVision.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            const pillar = t.futureVision.pillars[p.titleKey];
            return (
              <article
                key={p.titleKey}
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
                      {pillar.title}
                    </h3>
                    <span className="text-[10px] font-latin uppercase tracking-wider text-[var(--brand-muted)]">
                      {pillar.titleEn}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-[var(--brand-muted)] leading-relaxed">
                  {pillar.text}
                </p>
                <div
                  className="absolute bottom-0 inset-x-0 h-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"
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
