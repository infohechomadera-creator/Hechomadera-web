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
      badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200",
      title: "Recibimos tu pago",
      body: "Estamos listos para empezar. Un asesor de Hechomadera te escribe en las próximas horas para coordinar los detalles de tu pedido.",
      cta: "¿Tienes alguna pregunta? Escríbenos por WhatsApp — respondemos en menos de 15 minutos.",
    },
    pending: {
      badge: "Pago en revisión",
      badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
      title: "Tu pago está en proceso",
      body: "Mercado Pago está verificando la transacción. Esto puede tomar unos minutos. Te avisaremos cuando se confirme — guarda tu número de orden como referencia.",
      cta: "Si necesitas ayuda o tienes dudas, escríbenos por WhatsApp.",
    },
    rejected: {
      badge: "Pago no completado",
      badgeClass: "bg-red-50 text-red-800 border border-red-200",
      title: "No pudimos procesar tu pago",
      body: "La transacción no se completó. No se realizó ningún cobro. Puedes intentarlo de nuevo desde la tienda o escribirnos si necesitas ayuda con el pago.",
      cta: "¿Problemas con el pago? Te ayudamos por WhatsApp.",
    },
  } as const;

  const state = normalizedState && normalizedState in content ? normalizedState : null;
  const c = state ? content[state] : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:px-6 md:py-24">

      {/* Badge de estado */}
      {c && (
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${c.badgeClass}`}>
          {c.badge}
        </span>
      )}

      {/* Título */}
      <h1 className="font-display mt-4 text-2xl font-semibold text-ink md:text-3xl">
        {c?.title ?? "Volviste desde Mercado Pago"}
      </h1>

      {/* Mensaje principal */}
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        {c?.body ?? "Si completaste un pago, la confirmación puede tardar unos instantes. Guarda tu número de orden como referencia y contáctanos si tienes dudas."}
      </p>

      {/* Resumen del pedido */}
      {order && (
        <div className="mt-8 border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Resumen de tu pedido</p>
          </div>
          <div className="px-5 py-4">
            <ul className="space-y-2">
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
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
              <span className="text-sm font-semibold text-ink">Total</span>
              <span className="text-base font-semibold text-ink">{formatCOP(order.total_cop)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Número de orden */}
      {orderReference && (
        <p className="mt-4 text-xs text-ink-muted">
          Número de orden: <span className="font-mono font-semibold text-ink">{orderReference}</span>
        </p>
      )}

      {/* CTA WhatsApp */}
      {c && (
        <div className="mt-8 border border-neutral-200 bg-paper-dim px-5 py-4">
          <p className="text-sm text-ink-muted">{c.cta}</p>
          <a
            href={getWaLink(orderReference)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
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
            className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
          >
            Volver a la tienda
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
          >
            Ir al inicio
          </Link>
        )}
        <Link
          href="/contacto"
          className="inline-flex items-center justify-center border border-neutral-300 px-6 py-3 text-sm font-medium text-ink hover:border-ink"
        >
          Contacto
        </Link>
      </div>

    </div>
  );
}
