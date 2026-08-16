"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const h = window.innerHeight;
      // Show after scrolling past ~1 viewport
      setVisible(y > h * 0.8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="بازگشت به بالا"
      className={cn(
        "fixed bottom-5 left-5 z-40 w-11 h-11 rounded-full",
        "bg-[var(--brand-surface)] border border-[var(--brand-border)]",
        "flex items-center justify-center",
        "text-[var(--brand-text)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]",
        "shadow-lg shadow-black/30 backdrop-blur-md",
        "transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
