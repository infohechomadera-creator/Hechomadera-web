"use client";

import { useState } from "react";

interface Props {
  images: { src: string; alt: string }[];
}

export function ProductGallery({ images }: Props) {
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      {/* main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-card border border-cloud bg-paper-dim lg:flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[active].src}
          src={images[active].src}
          alt={images[active].alt}
          className="h-full w-full object-cover"
        />
        {/* counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 rounded-full bg-snow/90 px-3 py-1 text-caption font-medium tabular-nums text-graphite backdrop-blur-sm md:bottom-5 md:right-5">
            {active + 1} / {images.length}
          </div>
        )}
        {/* arrow navigation */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cloud bg-snow/90 text-graphite backdrop-blur-sm transition-colors hover:bg-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => setActive((i) => (i + 1) % images.length)}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cloud bg-snow/90 text-graphite backdrop-blur-sm transition-colors hover:bg-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-0.5 lg:w-24 lg:flex-col lg:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`Ver imagen ${i + 1}`}
              onClick={() => setActive(i)}
              className={`shrink-0 overflow-hidden rounded-button border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                active === i ? "border-ink" : "border-cloud hover:border-mist"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="h-16 w-16 object-cover lg:h-[88px] lg:w-[88px]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
