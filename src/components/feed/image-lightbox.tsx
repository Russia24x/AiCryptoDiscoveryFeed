"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
  title?: string;
}

/**
 * Full-screen image lightbox with prev/next navigation and zoom.
 *
 * - Opens over the ArticleReader (z-50 to override sheet).
 * - Keyboard: ESC closes, ← / → navigate, +/- zoom.
 * - Click outside image or close button to close.
 * - Shows image counter (1/5) and current image alt text.
 */
export function ImageLightbox({
  images,
  startIndex,
  onClose,
  title,
}: ImageLightboxProps) {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);

  const onPrev = useCallback(() => {
    setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
    setZoom(1);
  }, [images.length]);

  const onNext = useCallback(() => {
    setIdx((i) => (i === images.length - 1 ? 0 : i + 1));
    setZoom(1);
  }, [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.5));
      else if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.5));
      else if (e.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  // Prevent body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  if (!images.length) return null;

  const current = images[idx];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-latin opacity-70">
            {idx + 1} / {images.length}
          </span>
          {title && (
            <span className="text-xs truncate opacity-60 max-w-[40vw]">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
            disabled={zoom <= 0.5}
            aria-label="Zoom out"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-latin opacity-60 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
            disabled={zoom >= 4}
            aria-label="Zoom in"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            aria-label="Reset zoom"
            className="text-xs font-latin px-2 py-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            100%
          </button>

          <span className="mx-2 h-5 w-px bg-white/20" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close lightbox"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-4"
        onClick={(e) => {
          // Close when clicking outside the image
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Prev button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Image */}
        <img
          src={current}
          alt={title || `Image ${idx + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-zoom-in"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
          referrerPolicy="no-referrer"
        />

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next image"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip (if multiple images) */}
      {images.length > 1 && (
        <div className="px-4 py-3 bg-black/50 border-t border-white/10">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setIdx(i);
                  setZoom(1);
                }}
                className={cn(
                  "shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all",
                  i === idx
                    ? "border-[var(--brand-accent)] opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-[10px] text-white/40 text-center font-latin pb-2">
        ESC to close · ← → navigate · +/- zoom
      </p>
    </div>
  );
}
