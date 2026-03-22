import type { Metadata } from "next";
import Link from "next/link";
import { LegalNotice } from "@/components/legal/LegalNotice";

export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false, follow: false },
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Política de privacidad</h1>
      <p className="mt-2 text-sm text-ink-muted">Borrador orientativo — revisión legal y datos del responsable pendientes.</p>

      <div className="mt-8 space-y-6">
        <LegalNotice />

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">1. Responsable del tratamiento</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Hechomadera trata datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (y normas concordantes).
            Completar: identificación del responsable, dirección física, correo y canal de atención de peticiones, quejas y reclamos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">2. Datos que podemos tratar</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>Datos de identificación y contacto (nombre, teléfono, correo, ciudad).</li>
            <li>Datos relativos a consultas, cotizaciones y compras.</li>
            <li>Datos técnicos del dispositivo o navegación cuando corresponda (ver política de cookies).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">3. Finalidades</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Atender solicitudes, cotizar, gestionar pedidos, comunicaciones operativas, mejorar el servicio y cumplir obligaciones
            legales. Las finalidades exactas y la base legal deben detallarse en el aviso de privacidad definitivo.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">4. Derechos de los titulares</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Conocer, actualizar, rectificar y suprimir datos; revocar la autorización cuando proceda; presentar quejas ante la
            Superintendencia de Industria y Comercio. Canal de contacto:{" "}
            <Link href="/contacto" className="underline">
              página de contacto
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">5. Transferencias</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Si se usan proveedores (hosting, email transaccional, pasarela de pago), deben listarse categorías de encargados y
            transferencias autorizadas según el tratamiento real.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">6. Conservación</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Los datos se conservarán el tiempo necesario para las finalidades y plazos legales aplicables.
          </p>
        </section>
      </div>
    </div>
  );
}
