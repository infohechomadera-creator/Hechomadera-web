import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false, follow: false },
};

const h2 = "font-display text-xl font-semibold text-ink";
const p = "mt-3 text-sm leading-relaxed text-ink-muted";
const ul = "mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-ink-muted";

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Política de privacidad</h1>
      <p className="mt-2 text-sm text-ink-muted">Última actualización: 24 de noviembre de 2026.</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className={h2}>1. Responsable del tratamiento</h2>
          <p className={p}>
            Hechomadera trata datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (y normas concordantes).
            Para peticiones, quejas y reclamos puedes contactarnos a través de la{" "}
            <Link href="/contacto" className="underline">página de contacto</Link>.
          </p>
        </section>

        <section>
          <h2 className={h2}>2. Datos que podemos tratar</h2>
          <ul className={ul}>
            <li>Datos de identificación y contacto (nombre, teléfono, correo, ciudad).</li>
            <li>
              Lo que nos cuentas para diseñar tu proyecto: forma, medidas, acabados, electrodomésticos y las fotos de tu espacio que
              subes en el configurador.
            </li>
            <li>Datos de pagos: valor, fecha y referencia del pago. No guardamos datos de tarjetas: los maneja Mercado Pago.</li>
            <li>Datos técnicos del dispositivo o navegación cuando corresponda (ver política de cookies).</li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>3. Finalidades</h2>
          <p className={p}>
            Atender solicitudes, contactarte, preparar el diseño y la cotización de tu proyecto, cobrar y registrar pagos, fabricar e
            instalar, gestionar pedidos, enviarte comunicaciones operativas, mejorar el servicio y cumplir obligaciones legales. Las
            fotos de tu espacio solo se usan para diseñar y cotizar tu proyecto: no se publican.
          </p>
        </section>

        <section>
          <h2 className={h2}>4. Asistente de conversación</h2>
          <p className={p}>
            En el configurador puedes elegir conversar con un asistente de inteligencia artificial en lugar de llenar el formulario.
            Lo que escribas ahí lo procesa nuestro proveedor de inteligencia artificial (Anthropic, en Estados Unidos) solo para
            responderte y llenar el formulario. Hechomadera no guarda la conversación; el proveedor puede conservarla por un
            tiempo limitado según sus propias políticas. El asistente no da precios: el rango lo calcula el
            Sitio. Si prefieres que tus datos no salgan del formulario, usa el formulario.
          </p>
        </section>

        <section>
          <h2 className={h2}>5. Derechos de los titulares</h2>
          <p className={p}>
            Conocer, actualizar, rectificar y suprimir datos; revocar la autorización cuando proceda; presentar quejas ante la
            Superintendencia de Industria y Comercio. Canal de contacto:{" "}
            <Link href="/contacto" className="underline">
              página de contacto
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className={h2}>6. Proveedores y transferencias</h2>
          <p className={p}>
            Compartimos datos solo con los proveedores necesarios para operar, que actúan como encargados del tratamiento bajo las
            condiciones de la ley: alojamiento del Sitio y base de datos (Vercel y Supabase), correo transaccional (Resend), pagos
            (Mercado Pago), el asistente de conversación (Anthropic) y nuestro sistema interno de producción. Algunos de ellos guardan
            o procesan datos fuera de Colombia (por ejemplo, en Estados Unidos); al aceptar la autorización de datos aceptas esa
            transferencia.
          </p>
        </section>

        <section>
          <h2 className={h2}>7. Conservación y borrado</h2>
          <ul className={ul}>
            <li>Los datos se conservan el tiempo necesario para las finalidades y los plazos legales aplicables.</li>
            <li>
              Si pagas el diseño y no apruebas la propuesta, borramos tus datos personales, las fotos de tu espacio y las notas de tu
              proyecto. Solo conservamos el registro de los pagos, como pide la ley.
            </li>
            <li>Puedes pedir el borrado de tus datos en cualquier momento por la página de contacto.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
