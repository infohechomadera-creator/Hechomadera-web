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
    <div className="border border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-neutral-50"
      >
        <div>
          <p className="font-display text-lg font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        </div>
        <span className="shrink-0 text-xl font-light text-ink-muted transition-transform duration-300" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
          +
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-200">
          {children}
        </div>
      )}
    </div>
  );
}
