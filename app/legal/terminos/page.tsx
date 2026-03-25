import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Términos y condiciones de uso del sitio</h1>
      <p className="mt-2 text-sm text-ink-muted">Última actualización: marzo 2026.</p>

      <div className="mt-8 space-y-6">

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">1. Identificación</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            El sitio web Hechomadera (en adelante, el &quot;Sitio&quot;) es operado por Hechomadera. El uso del Sitio implica la aceptación de estos términos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">2. Servicios</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            El Sitio ofrece información sobre productos de marketplace, proyectos a medida y canales de contacto. Las cotizaciones y
            contratos específicos se formalizan fuera del Sitio o mediante documentos aparte, según el proceso comercial de Hechomadera.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">3. Compras y pagos</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Los pagos en línea se procesan a través de Mercado Pago. El usuario acepta las condiciones y políticas de dicho proveedor.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">4. Propiedad intelectual</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Contenidos, marcas y materiales del Sitio están protegidos. No se autoriza reproducción sin consentimiento expreso.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">5. Limitación de responsabilidad</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            El Sitio se ofrece con la información disponible en cada momento. Hechomadera no será responsable por daños derivados del uso del Sitio fuera de su control.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">6. Ley aplicable</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Para conflictos relacionados con el uso del Sitio se aplicará la legislación de la República de Colombia y la jurisdicción competente en Colombia.
          </p>
        </section>
      </div>
    </div>
  );
}
