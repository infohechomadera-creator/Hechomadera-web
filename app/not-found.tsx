import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center px-4 py-20 text-center md:px-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-ink-muted">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink md:text-4xl">
        Esta página no existe.
      </h1>
      <p className="mt-4 max-w-md text-sm text-ink-muted">
        El enlace puede estar roto o la página fue movida. Desde aquí podés volver al inicio o
        escribirnos directamente.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Volver al inicio
        </Link>
        <Link
          href="/contacto"
          className="inline-flex items-center justify-center border border-neutral-300 px-6 py-3 text-sm font-medium text-ink hover:border-ink"
        >
          Contactar
        </Link>
      </div>
    </div>
  );
}
