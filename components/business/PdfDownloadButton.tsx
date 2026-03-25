"use client";

import { track } from "@/lib/analytics";

export function PdfDownloadButton() {
  return (
    <a
      href="/guia-de-medidas.pdf"
      download
      onClick={() => track("pdf_download", { document: "guia-de-medidas" })}
      className="inline-flex shrink-0 items-center justify-center gap-2 border border-ink bg-white px-6 py-3 text-sm font-medium text-ink hover:bg-neutral-50"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Descargar guía (PDF)
    </a>
  );
}
