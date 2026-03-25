import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  robots: { index: false, follow: false },
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Política de cookies</h1>
      <p className="mt-2 text-sm text-ink-muted">Última actualización: marzo 2026.</p>

      <div className="mt-8 space-y-6">

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">1. ¿Qué son las cookies?</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Archivos pequeños que el navegador almacena en el dispositivo para recordar preferencias, mantener sesiones o medir uso del Sitio.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">2. Cookies que usamos</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">Técnicas / necesarias:</strong> funcionamiento básico del Sitio y recordar tu elección en el aviso de cookies.
            </li>
            <li>
              <strong className="text-ink">Analíticas (opcionales):</strong> medición de uso del Sitio mediante Google Analytics y Vercel Analytics, con tu consentimiento.
            </li>
            <li>
              <strong className="text-ink">Marketing (opcionales):</strong> activadas únicamente con tu consentimiento previo.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">3. Cómo gestionarlas</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Puedes borrar o bloquear cookies desde la configuración de tu navegador. El aviso en la parte inferior del Sitio te permite registrar tu preferencia de aceptación.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">4. Actualizaciones</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Esta política puede actualizarse cuando cambien las herramientas del Sitio. La fecha en la parte superior indica la versión vigente.
          </p>
        </section>
      </div>
    </div>
  );
}
