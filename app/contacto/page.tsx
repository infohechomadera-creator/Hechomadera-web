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
    <div data-track-section="contacto-main" className="contenedor seccion">
      <h1 className="titulo-display">Contacto</h1>
      <p className="mt-5 max-w-2xl text-body-lg text-ink-muted">
        Cobertura inicial: {siteConfig.cities.join(", ")}. Prioridad: WhatsApp &lt; 15 min · formulario &lt; 3h (objetivo operativo).
      </p>

      <div className="mt-10 grid gap-3 md:mt-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="tarjeta p-7 md:p-10">
          <h2 className="titulo-tarjeta">Escríbenos</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Déjanos tus datos y te respondemos lo antes posible.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bloque-oscuro p-7 md:p-9">
            <h2 className="font-display text-subheading font-semibold text-snow">WhatsApp</h2>
            <p className="mt-2 text-sm text-ash">Canal rápido para dudas y seguimiento.</p>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="contacto_page"
              className="boton-claro mt-6 w-full focus-visible:outline-snow"
            >
              Abrir WhatsApp
            </a>
          </div>

          <div className="tarjeta-suave p-7 md:p-9">
            <h2 className="titulo-tarjeta">Agenda</h2>
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
