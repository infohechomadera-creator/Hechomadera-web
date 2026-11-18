"use client";

import { useState } from "react";

interface Props {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, description, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="tarjeta overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left transition-colors hover:bg-paper-dim focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink sm:px-7 sm:py-7"
      >
        <div>
          <p className="titulo-tarjeta">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl font-light leading-none transition-[transform,background-color,color] duration-300 ${
            open ? "border-ink bg-ink text-snow" : "border-cloud bg-snow text-ink"
          }`}
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>

      {open && (
        <div className="border-t border-cloud">
          {children}
        </div>
      )}
    </div>
  );
}
