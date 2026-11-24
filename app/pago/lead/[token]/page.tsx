import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartCheckoutButton } from "@/components/payments/StartCheckoutButton";
import { leerCobroLead, nombreProducto, tituloCobro } from "@/lib/pagos/lead";
import { MOTIVO_SIN_COBRO } from "@/lib/pagos/calcular";
import { pesos } from "@/lib/leads";
import { COBROS_EN_PAUSA, cobrosLeadsActivos, puedeCobrarAqui } from "@/lib/pagos/procesar";
import { rolActual } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Pago de tu proyecto",
  robots: { index: false, follow: false },
  // La dirección lleva el código secreto del enlace: no se comparte con otros sitios al salir de aquí.
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "573012890552";
const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hola, tengo una pregunta sobre el pago de mi proyecto en hechomadera.com.")}`;

/**
 * Enlace de pago de un lead (W5). Muestra solo el siguiente cobro; el valor lo calcula el servidor.
 * No muestra datos personales: quien tenga el enlace solo ve producto, ciudad y valor.
 */
export default async function PagoLeadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await leerCobroLead(token);
  if (!info) notFound();
  const producto = nombreProducto(info.producto);
  const soloGerencia = !(await puedeCobrarAqui(rolActual));

  const textos = {
    diseno: {
      titulo: `Paga el diseño de tu ${producto}`,
      cuerpo:
        "Con este pago empezamos el diseño de tu proyecto y te enviamos la propuesta en máximo 48 horas. Si apruebas la propuesta, este valor se descuenta del anticipo.",
      aviso: "El diseño no es reembolsable: si no lo apruebas, recibes el render, es tuyo, y borramos tus datos.",
    },
    anticipo: {
      titulo: `Anticipo de tu ${producto}`,
      cuerpo: "Con el anticipo empezamos la producción. Es un porcentaje del valor final de tu propuesta, menos el diseño que ya pagaste.",
      aviso: "El saldo se calcula con las medidas confirmadas en tu espacio.",
    },
    saldo: {
      titulo: `Saldo de tu ${producto}`,
      cuerpo: "Es lo que falta por pagar, calculado con las medidas confirmadas: valor final menos el diseño y el anticipo.",
      aviso: null,
    },
  } as const;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:px-6 md:py-24">
      {!cobrosLeadsActivos() ? (
        <>
          <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">Pago de tu {producto}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{COBROS_EN_PAUSA}</p>
        </>
      ) : soloGerencia ? (
        <>
          <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">Pago de tu {producto}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Esta es una versión de prueba del sitio. Para pagar usa el enlace de hechomadera.com que te envió tu asesor.
          </p>
        </>
      ) : info.cobro.ok ? (
        <>
          <span className="inline-block rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-ink-muted">
            {info.ciudad}
          </span>
          <h1 className="font-display mt-4 text-2xl font-semibold text-ink md:text-3xl">{textos[info.cobro.tipo].titulo}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{textos[info.cobro.tipo].cuerpo}</p>

          <div className="mt-8 border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Resumen del pago</p>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4 text-sm">
              <span className="text-ink">{tituloCobro(info.cobro.tipo, info.producto).replace(" — Hechomadera", "")}</span>
              <span className="shrink-0 text-base font-semibold text-ink">{pesos(info.cobro.monto)}</span>
            </div>
          </div>

          <div className="mt-6">
            <StartCheckoutButton
              label={`Pagar ${pesos(info.cobro.monto)} con Mercado Pago`}
              title={`pago_${info.cobro.tipo}`}
              unitPrice={info.cobro.monto}
              pagoToken={token}
            />
          </div>
          {textos[info.cobro.tipo].aviso && <p className="mt-4 text-xs text-ink-muted">{textos[info.cobro.tipo].aviso}</p>}
          <p className="mt-2 text-xs text-ink-muted">
            Pago procesado por Mercado Pago. Consulta los{" "}
            <Link href="/legal/terminos" className="underline">
              términos
            </Link>
            .
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">Pago de tu {producto}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{MOTIVO_SIN_COBRO[info.cobro.motivo]}</p>
        </>
      )}

      <div className="mt-8 border border-neutral-200 bg-paper-dim px-5 py-4">
        <p className="text-sm text-ink-muted">¿Tienes alguna pregunta? Escríbenos por WhatsApp.</p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Escribir por WhatsApp
        </a>
      </div>
    </div>
  );
}
