import type { Metadata } from "next";
import { LegalNotice } from "@/components/legal/LegalNotice";

export const metadata: Metadata = {
  title: "Política de cookies",
  robots: { index: false, follow: false },
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Política de cookies</h1>
      <p className="mt-2 text-sm text-ink-muted">Borrador — alinear con herramientas de analítica o publicidad si se activan.</p>

      <div className="mt-8 space-y-6">
        <LegalNotice />

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">1. ¿Qué son las cookies?</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Archivos pequeños que el navegador almacena en el dispositivo para recordar preferencias, mantener sesiones o medir uso del
            Sitio.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">2. Cookies que podemos usar</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">Técnicas / necesarias:</strong> funcionamiento básico del Sitio y recordar tu elección en el
              aviso de cookies.
            </li>
            <li>
              <strong className="text-ink">Analíticas o de rendimiento (opcionales):</strong> solo si se activan — describir
              proveedor (ej. Vercel Analytics) y finalidad.
            </li>
            <li>
              <strong className="text-ink">Marketing (opcionales):</strong> solo si se activan — requieren consentimiento previo
              acorde a política y normativa.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">3. Cómo gestionarlas</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Puedes borrar cookies desde la configuración de tu navegador. El aviso inferior del Sitio permite registrar tu aceptación
            del texto informativo; si en el futuro se activan cookies no esenciales, conviene un panel de preferencias o bloqueo hasta
            consentimiento.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">4. Actualizaciones</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Esta política puede actualizarse cuando cambien las herramientas del Sitio. Revisa la fecha de actualización en la parte
            superior cuando publiquéis la versión definitiva.
          </p>
        </section>
      </div>
    </div>
  );
}
