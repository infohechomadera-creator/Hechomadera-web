import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inspiración",
  description: "Galería, estilos e ideas para tu proyecto.",
};

export default function InspiracionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Inspiración</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Aquí conectaremos galería y herramientas (calculadora, quiz de estilo) en fases siguientes. Por ahora, placeholder para maquetar
        grid de imágenes con prompts.
      </p>
    </div>
  );
}
