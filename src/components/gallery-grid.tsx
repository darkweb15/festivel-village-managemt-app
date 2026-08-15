"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { GalleryItem } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/** YouTube/Vimeo links are embedded; anything else is treated as a media file. */
function embedUrl(url: string) {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function GalleryGrid({
  items,
  layout = "masonry",
}: {
  items: GalleryItem[];
  layout?: "masonry" | "grid";
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? null : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  return (
    <>
      <ul
        className={cn(
          layout === "masonry"
            ? "columns-2 gap-3 [column-fill:_balance] sm:columns-3"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3",
        )}
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            className={cn(layout === "masonry" && "mb-3 break-inside-avoid")}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="press group relative block w-full overflow-hidden rounded-tile bg-ink-100 ring-1 ring-hairline"
              aria-label={`Open ${item.title ?? "media"}`}
            >
              <span
                className="relative block w-full"
                style={{
                  aspectRatio:
                    layout === "grid"
                      ? "1 / 1"
                      : item.width && item.height
                        ? `${item.width} / ${item.height}`
                        : index % 3 === 0
                          ? "3 / 4"
                          : "1 / 1",
                }}
              >
                <Image
                  src={item.thumbnail_url ?? item.url}
                  alt={item.title ?? item.caption ?? ""}
                  fill
                  sizes="(min-width: 768px) 240px, 45vw"
                  className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
              </span>

              {item.media_type === "video" ? (
                <span className="absolute inset-0 grid place-items-center bg-ink-900/20">
                  <span className="grid size-11 place-items-center rounded-full bg-white/90 text-saffron-700 shadow-sm">
                    <Play className="size-4 translate-x-px fill-current" aria-hidden />
                  </span>
                </span>
              ) : null}

              {item.title ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/70 to-transparent px-3 pt-8 pb-2.5 text-left text-[0.75rem] font-medium text-white">
                  <span className="line-clamp-1">{item.title}</span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null ? (
        <Lightbox
          items={items}
          index={openIndex}
          onClose={close}
          onStep={step}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onStep,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const item = items[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const embed = item.media_type === "video" ? embedUrl(item.url) : null;

  useEffect(() => {
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, onStep]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title ?? "Gallery viewer"}
      className="animate-fade fixed inset-0 z-50 flex flex-col bg-ink-900/95 backdrop-blur-sm"
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-4"
        style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}
      >
        <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-white/90">
          {item.title ?? `${index + 1} of ${items.length}`}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/12 text-white hover:bg-white/20"
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="animate-scale-in relative flex min-h-0 flex-1 items-center justify-center px-4">
        {item.media_type === "video" ? (
          embed ? (
            <iframe
              src={embed}
              title={item.title ?? "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full max-w-3xl rounded-card border-0 bg-black"
            />
          ) : (
            <video
              src={item.url}
              controls
              playsInline
              className="max-h-full w-full max-w-3xl rounded-card bg-black"
            />
          )
        ) : (
          <div className="relative h-full w-full max-w-3xl">
            <Image
              src={item.url}
              alt={item.title ?? item.caption ?? ""}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-contain"
              priority
            />
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between gap-4 px-4 py-5"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1.25rem)" }}
      >
        <LightboxNav label="Previous" onClick={() => onStep(-1)}>
          <ChevronLeft className="size-5" strokeWidth={2.2} aria-hidden />
        </LightboxNav>

        <p className="min-w-0 flex-1 text-center text-[0.75rem] leading-relaxed text-white/70">
          {item.caption ?? `${index + 1} / ${items.length}`}
        </p>

        <LightboxNav label="Next" onClick={() => onStep(1)}>
          <ChevronRight className="size-5" strokeWidth={2.2} aria-hidden />
        </LightboxNav>
      </div>
    </div>
  );
}

function LightboxNav({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press grid size-11 shrink-0 place-items-center rounded-full bg-white/12 text-white hover:bg-white/20"
    >
      {children}
    </button>
  );
}
