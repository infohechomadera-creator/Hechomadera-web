import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="contenedor py-14 md:py-20">
      <div className="tarjeta mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-7 py-16 text-center">
        <p className="etiqueta-ember font-mono">404</p>
        <h1 className="titulo-display mt-5 text-balance">
          Esta página no existe.
        </h1>
        <p className="mt-5 max-w-md text-body text-ink-muted">
          El enlace puede estar roto o la página fue movida. Desde aquí podés volver al inicio o
          escribirnos directamente.
        </p>
        <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/"
            className="boton-primario"
          >
            Volver al inicio
          </Link>
          <Link
            href="/contacto"
            className="boton-borde"
          >
            Contactar
          </Link>
        </div>
      </div>
    </div>
  );
}
