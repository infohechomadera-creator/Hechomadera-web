import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center md:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">404</p>
      <h1 className="font-display mt-4 text-3xl font-semibold text-ink">Página no encontrada</h1>
      <p className="mt-4 text-sm text-ink-muted">
        La ruta no existe o ya no está disponible. Si buscabas una prueba de pago en producción, puede estar desactivada por
        configuración.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Ir al inicio
        </Link>
        <Link
          href="/contacto"
          className="inline-flex items-center justify-center border border-neutral-300 px-6 py-3 text-sm font-medium text-ink hover:border-ink"
        >
          Contacto
        </Link>
      </div>
    </div>
  );
}
