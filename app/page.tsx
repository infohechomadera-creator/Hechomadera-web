import { Button } from "@/components/ui/Button";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { siteConfig } from "@/lib/site-config";

export default function HomePage() {
  const wa = getWhatsAppHref("Hola Hechomadera, quiero orientación para mi proyecto.");

  return (
    <div>
      <section className="border-b border-neutral-200 bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Colombia · Carpintería premium digital</p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
            Tus espacios, hechos a medida — con proceso claro y acompañamiento experto.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            {siteConfig.tagline} Marketplace con precios claros o proyectos a medida con cotización transparente y abono inicial
            configurable ({siteConfig.business.depositPercentDefault}% por defecto).
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href="/tienda">Comprar en tienda</Button>
            <Button href="/proyectos" variant="secondary">
              Cotizar proyecto
            </Button>
            <Button href="/contacto" variant="secondary">
              Agendar asesoría
            </Button>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-dashed border-ink px-5 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">Por qué Hechomadera</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Diseño y visualización",
              d: "Propuesta clara antes de fabricar — menos sorpresas, más confianza.",
            },
            {
              t: "Cotización transparente",
              d: "En proyectos: precio desde y detalle; abono inicial por web configurable.",
            },
            {
              t: "Instalación y seguimiento",
              d: "Proceso acompañado de contacto a entrega en ciudades de cobertura.",
            },
          ].map((x) => (
            <li key={x.t} className="border border-neutral-200 bg-white p-6">
              <h3 className="font-medium text-ink">{x.t}</h3>
              <p className="mt-2 text-sm text-ink-muted">{x.d}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
