import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false, follow: false },
};

export default function PrivacidadPage() {
  return (
    <div className="contenedor seccion">
      <article className="tarjeta mx-auto max-w-3xl px-6 py-9 md:px-14 md:py-14">
        <div className="mx-auto max-w-prose">
          <h1 className="titulo-seccion text-balance">Política de privacidad</h1>
          <p className="mt-3 text-sm text-ink-soft">Última actualización: marzo 2026.</p>

          <div className="mt-8 divide-y divide-cloud border-t border-cloud">

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">1. Responsable del tratamiento</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Hechomadera trata datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (y normas concordantes).
                Para peticiones, quejas y reclamos puedes contactarnos a través de la{" "}
                <Link href="/contacto" className="text-ink underline underline-offset-4 hover:text-ink-muted">página de contacto</Link>.
              </p>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">2. Datos que podemos tratar</h2>
              <ul className="mt-3 list-outside list-disc space-y-2 pl-5 text-body leading-relaxed text-ink-muted marker:text-ash">
                <li>Datos de identificación y contacto (nombre, teléfono, correo, ciudad).</li>
                <li>Datos relativos a consultas, cotizaciones y compras.</li>
                <li>Datos técnicos del dispositivo o navegación cuando corresponda (ver política de cookies).</li>
              </ul>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">3. Finalidades</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Atender solicitudes, cotizar, gestionar pedidos, comunicaciones operativas, mejorar el servicio y cumplir obligaciones legales.
              </p>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">4. Derechos de los titulares</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Conocer, actualizar, rectificar y suprimir datos; revocar la autorización cuando proceda; presentar quejas ante la
                Superintendencia de Industria y Comercio. Canal de contacto:{" "}
                <Link href="/contacto" className="text-ink underline underline-offset-4 hover:text-ink-muted">
                  página de contacto
                </Link>.
              </p>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">5. Transferencias</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Podemos compartir datos con proveedores de servicios necesarios para la operación del Sitio (hosting, correo transaccional, pasarela de pago), quienes actúan como encargados del tratamiento bajo las condiciones exigidas por la ley.
              </p>
            </section>

            <section className="py-7 last:pb-0">
              <h2 className="font-display text-lg font-semibold text-ink">6. Conservación</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                Los datos se conservarán el tiempo necesario para las finalidades y plazos legales aplicables.
              </p>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
}
