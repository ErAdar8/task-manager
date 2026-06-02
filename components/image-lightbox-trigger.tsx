"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { displayImageSrc } from "@/lib/display-image";
import { cn } from "@/lib/utils/cn";

type ImageLightboxTriggerProps = {
  src: string;
  alt?: string;
  /** Classes on the thumbnail `<img />` */
  imgClassName?: string;
  /** Classes on the clickable trigger (wraps the thumbnail) */
  className?: string;
};

/**
 * Thumbnail that opens a full-screen lightbox on click (Escape or backdrop to close).
 * Uses `displayImageSrc` so data URLs and stored paths both work.
 */
export function ImageLightboxTrigger({
  src,
  alt = "",
  imgClassName,
  className,
}: ImageLightboxTriggerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const resolved = displayImageSrc(src);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const overlay =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={() => setOpen(false)}
      >
        <span id={titleId} className="sr-only">
          Enlarged image
        </span>
        <button
          type="button"
          className="absolute top-3 right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 z-10"
          onClick={() => setOpen(false)}
          aria-label="Close image"
        >
          <X className="h-5 w-5" />
        </button>
        <div
          className="max-h-[90vh] max-w-[min(100vw-2rem,1200px)] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- user uploads / stored refs */}
          <img
            src={resolved}
            alt={alt}
            className="max-h-[90vh] max-w-full object-contain rounded shadow-lg"
          />
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded",
          className
        )}
        aria-label="View image larger"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user uploads / stored refs */}
        <img src={resolved} alt={alt} className={imgClassName} />
      </button>
      {overlay && createPortal(overlay, document.body)}
    </>
  );
}
