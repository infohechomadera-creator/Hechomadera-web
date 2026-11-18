import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { ContactForm } from "@/components/contact/ContactForm";
import { getWhatsAppHref } from "@/lib/whatsapp";

/** Evita HTML estático cacheado de un deploy antiguo */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacto — Carpinteros y Cocinas Integrales en Bogotá, Medellín, Cali y más",
  description:
    "Carpinteros y carpinterías en Bogotá, Medellín, Cali, Barranquilla, Santa Marta, Cartagena y más. Cotiza cocinas integrales, closets, muebles de madera y remodelación — respuesta en menos de 15 minutos.",
};

export default function ContactoPage() {
  const wa = getWhatsAppHref("Hola Hechomadera, quiero hablar con un asesor.");

  return (
    <div data-track-section="contacto-main" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Contacto</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Cobertura inicial: {siteConfig.cities.join(", ")}. Prioridad: WhatsApp &lt; 15 min · formulario &lt; 3h (objetivo operativo).
      </p>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Escríbenos</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Déjanos tus datos y te respondemos lo antes posible.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>

        <div className="space-y-8">
          <div className="border border-neutral-200 bg-white p-8">
            <h2 className="font-display text-xl font-semibold text-ink">WhatsApp</h2>
            <p className="mt-2 text-sm text-ink-muted">Canal rápido para dudas y seguimiento.</p>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="contacto_page"
              className="mt-6 inline-flex w-full items-center justify-center border border-ink bg-ink px-4 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
            >
              Abrir WhatsApp
            </a>
          </div>

          <div className="border border-neutral-200 bg-paper-dim p-8">
            <h2 className="font-display text-xl font-semibold text-ink">Agenda</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Calendario Google (por asesor) se integrará aquí o enlace externo — configuración manual cuando definan
              flujo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
