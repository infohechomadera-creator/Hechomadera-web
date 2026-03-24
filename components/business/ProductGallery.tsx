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
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 lg:flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[active].src}
          src={images[active].src}
          alt={images[active].alt}
          className="h-full w-full object-cover"
        />
        {/* counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-ink/70 px-2 py-1 font-mono text-xs text-paper">
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
              className="absolute left-3 top-1/2 -translate-y-1/2 border border-neutral-300 bg-paper/90 p-2 hover:bg-paper"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => setActive((i) => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 border border-neutral-300 bg-paper/90 p-2 hover:bg-paper"
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
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-y-auto lg:w-20">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`Ver imagen ${i + 1}`}
              onClick={() => setActive(i)}
              className={`shrink-0 border-2 transition-colors ${
                active === i ? "border-ink" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="h-16 w-16 object-cover lg:h-20 lg:w-20"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
