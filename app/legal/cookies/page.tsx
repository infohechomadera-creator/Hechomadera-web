import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  robots: { index: false, follow: false },
};

export default function CookiesPage() {
  return (
    <div className="contenedor seccion">
      <article className="tarjeta mx-auto max-w-3xl px-6 py-9 md:px-14 md:py-14">
        <div className="mx-auto max-w-prose">
          <h1 className="titulo-seccion text-balance">Política de cookies</h1>
          <p className="mt-3 text-sm text-ink-soft">Última actualización: marzo 2026.</p>

          <div className="mt-8 divide-y divide-cloud border-t border-cloud">

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">1. ¿Qué son las cookies?</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Archivos pequeños que el navegador almacena en el dispositivo para recordar preferencias, mantener sesiones o medir uso del Sitio.
              </p>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">2. Cookies que usamos</h2>
              <ul className="mt-3 list-outside list-disc space-y-2 pl-5 text-body leading-relaxed text-ink-muted marker:text-ash">
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

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">3. Cómo gestionarlas</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Puedes borrar o bloquear cookies desde la configuración de tu navegador. El aviso en la parte inferior del Sitio te permite registrar tu preferencia de aceptación.
              </p>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">4. Actualizaciones</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Esta política puede actualizarse cuando cambien las herramientas del Sitio. La fecha en la parte superior indica la versión vigente.
              </p>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
}
