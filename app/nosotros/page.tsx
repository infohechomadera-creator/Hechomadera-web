import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Experiencia, alianzas y enfoque premium en carpintería y espacios a medida.",
};

export default function NosotrosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Nosotros</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Historia, respaldo con constructoras y propuesta de valor alineada a propósito (no solo fichas técnicas). Contenido editable por
        prompt o importación desde WordPress.
      </p>
    </div>
  );
}
