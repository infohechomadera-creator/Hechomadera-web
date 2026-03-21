import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contacto y agenda",
  description: "Ciudades de cobertura, formulario y WhatsApp. SLA: respuesta prioritaria por canales definidos.",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Contacto</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Cobertura inicial: {siteConfig.cities.join(", ")}. Formulario de envío y calendario (Google Calendar) se integran en fase manual.
      </p>
      <div className="mt-10 rounded border border-neutral-200 bg-white p-8">
        <p className="text-sm text-ink-muted">
          Placeholder: aquí irá el formulario (Resend / servicio de email / CRM) sin exponer secretos en el repo.
        </p>
      </div>
    </div>
  );
}
