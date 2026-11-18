import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchLatestPaymentByExternalReference,
  fetchMercadoPagoPayment,
  normalizePaymentState,
} from "@/lib/mercadopago";
import { getOrder } from "@/lib/orders-store";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "573012890552";

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getWaLink(orderId?: string): string {
  const msg = orderId
    ? `Hola, acabo de realizar un pago en hechomadera.com. Mi número de orden es ${orderId}. ¿Me pueden confirmar los próximos pasos?`
    : "Hola, acabo de realizar un pago en hechomadera.com. ¿Me pueden ayudar con los próximos pasos?";
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export default async function PagoResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    payment_id?: string;
    collection_id?: string;
    order_id?: string;
    external_reference?: string;
  }>;
}) {
  const { estado, payment_id, collection_id, order_id, external_reference } = await searchParams;
  const paymentId = payment_id ?? collection_id;
  const orderReference = order_id ?? external_reference;

  // Consultar estado real desde MP
  type NormalizedState = "approved" | "pending" | "rejected" | null;
  let normalizedState: NormalizedState = estado === "aprobado"
    ? "approved"
    : estado === "rechazado"
    ? "rejected"
    : estado === "pendiente"
    ? "pending"
    : null;

  function toNormalized(s: string): NormalizedState {
    if (s === "approved") return "approved";
    if (s === "pending") return "pending";
    if (s === "rejected") return "rejected";
    return null;
  }

  let paymentDetail: { status: string; status_detail?: string } | null = null;

  if (paymentId) {
    const result = await fetchMercadoPagoPayment(paymentId);
    if (result.ok) {
      normalizedState = toNormalized(normalizePaymentState(result.payment.status));
      paymentDetail = { status: result.payment.status, status_detail: result.payment.status_detail };
    }
  } else if (orderReference) {
    const result = await fetchLatestPaymentByExternalReference(orderReference);
    if (result.ok) {
      normalizedState = toNormalized(normalizePaymentState(result.payment.status));
      paymentDetail = { status: result.payment.status, status_detail: result.payment.status_detail };
    }
  }

  // Cargar resumen del pedido desde Redis
  const order = orderReference ? await getOrder(orderReference) : null;

  // Contenido por estado
  const content = {
    approved: {
      badge: "Pago aprobado",
      badgeClass: "etiqueta-llena",
      title: "Recibimos tu pago",
      body: "Estamos listos para empezar. Un asesor de Hechomadera te escribe en las próximas horas para coordinar los detalles de tu pedido.",
      cta: "¿Tienes alguna pregunta? Escríbenos por WhatsApp — respondemos en menos de 15 minutos.",
    },
    pending: {
      badge: "Pago en revisión",
      badgeClass: "etiqueta bg-snow",
      title: "Tu pago está en proceso",
      body: "Mercado Pago está verificando la transacción. Esto puede tomar unos minutos. Te avisaremos cuando se confirme — guarda tu número de orden como referencia.",
      cta: "Si necesitas ayuda o tienes dudas, escríbenos por WhatsApp.",
    },
    rejected: {
      badge: "Pago no completado",
      badgeClass: "etiqueta-ember",
      title: "No pudimos procesar tu pago",
      body: "La transacción no se completó. No se realizó ningún cobro. Puedes intentarlo de nuevo desde la tienda o escribirnos si necesitas ayuda con el pago.",
      cta: "¿Problemas con el pago? Te ayudamos por WhatsApp.",
    },
  } as const;

  const state = normalizedState && normalizedState in content ? normalizedState : null;
  const c = state ? content[state] : null;

  return (
    <div className="contenedor py-14 md:py-24">
      <div className="mx-auto max-w-xl">

        {/* Badge de estado */}
        {c && (
          <span className={c.badgeClass}>
            {c.badge}
          </span>
        )}

        {/* Título */}
        <h1 className="titulo-seccion mt-4 text-balance">
          {c?.title ?? "Volviste desde Mercado Pago"}
        </h1>

        {/* Mensaje principal */}
        <p className="mt-4 text-body leading-relaxed text-ink-muted">
          {c?.body ?? "Si completaste un pago, la confirmación puede tardar unos instantes. Guarda tu número de orden como referencia y contáctanos si tienes dudas."}
        </p>

        {/* Resumen del pedido */}
        {order && (
          <div className="tarjeta mt-8 p-7">
            <p className="eyebrow">Resumen de tu pedido</p>
            <ul className="mt-5 space-y-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-ink">
                    {item.title}
                    {item.quantity > 1 && (
                      <span className="ml-1 text-ink-muted">× {item.quantity}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-ink">
                    {formatCOP(item.unit_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-cloud pt-5">
              <span className="text-sm font-semibold text-ink">Total</span>
              <span className="text-subheading font-semibold text-ink">{formatCOP(order.total_cop)}</span>
            </div>
          </div>
        )}

        {/* Número de orden */}
        {orderReference && (
          <p className="mt-4 break-all text-caption text-ink-muted">
            Número de orden: <span className="font-mono font-semibold text-ink">{orderReference}</span>
          </p>
        )}

        {/* CTA WhatsApp */}
        {c && (
          <div className="bloque-oscuro mt-8 p-7">
            <p className="text-sm text-ash">{c.cta}</p>
            <a
              href={getWaLink(orderReference)}
              target="_blank"
              rel="noopener noreferrer"
              className="boton-claro mt-5 w-full focus-visible:outline-snow sm:w-auto"
            >
              Escribir por WhatsApp
            </a>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {normalizedState === "rejected" ? (
            <Link
              href="/tienda"
              className="boton-primario"
            >
              Volver a la tienda
            </Link>
          ) : (
            <Link
              href="/"
              className="boton-primario"
            >
              Ir al inicio
            </Link>
          )}
          <Link
            href="/contacto"
            className="boton-borde"
          >
            Contacto
          </Link>
        </div>

      </div>
    </div>
  );
}
