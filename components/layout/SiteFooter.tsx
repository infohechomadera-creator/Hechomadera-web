import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-paper-dim">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{siteConfig.name}</p>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">{siteConfig.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/legal/terminos" className="hover:underline">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/legal/privacidad" className="hover:underline">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="hover:underline">
                Política de cookies
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Cobertura</p>
          <p className="mt-3 text-sm text-ink-muted">
            Ciudades principales en Colombia. Detalle en{" "}
            <Link href="/contacto" className="underline">
              Contacto
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="border-t border-neutral-200 px-4 py-6 text-center text-xs text-ink-muted">
        <p>Pagos en tienda procesados con Mercado Pago (checkout seguro).</p>
        <p className="mt-2">
          © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
