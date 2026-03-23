import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchLatestPaymentByExternalReference,
  fetchMercadoPagoPayment,
  normalizePaymentState,
} from "@/lib/mercadopago";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

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

  const copy: Record<
    string,
    { title: string; body: string; tone: "ok" | "warn" | "neutral" }
  > = {
    aprobado: {
      title: "Pago aprobado",
      body:
        "Recibimos la confirmación de Mercado Pago. En breve podrás recibir un comprobante o seguimiento por los canales que definamos (email/WhatsApp). Si no ves novedades en 24 h, escríbenos.",
      tone: "ok",
    },
    rechazado: {
      title: "Pago no completado",
      body:
        "La transacción no se finalizó o fue rechazada. No se realizó el cobro. Puedes intentar de nuevo desde la tienda o contactarnos si necesitas ayuda.",
      tone: "warn",
    },
    pendiente: {
      title: "Pago pendiente",
      body:
        "El pago puede estar en revisión (por ejemplo transferencia o medios que demoran). Te avisaremos cuando se confirme. Guarda cualquier referencia que te muestre Mercado Pago.",
      tone: "neutral",
    },
  };

  let block = estado ? copy[estado] : null;
  let paymentDetails: {
    payment_id: number;
    status: string;
    status_detail?: string;
    external_reference?: string;
  } | null = null;

  if (paymentId) {
    const paymentById = await fetchMercadoPagoPayment(paymentId);
    if (paymentById.ok) {
      const p = paymentById.payment;
      const normalized = normalizePaymentState(p.status);
      if (normalized === "approved") block = copy.aprobado;
      if (normalized === "pending") block = copy.pendiente;
      if (normalized === "rejected") block = copy.rechazado;
      paymentDetails = {
        payment_id: p.id,
        status: p.status,
        status_detail: p.status_detail,
        external_reference: p.external_reference,
      };
    }
  } else if (orderReference) {
    const paymentByReference = await fetchLatestPaymentByExternalReference(orderReference);
    if (paymentByReference.ok) {
      const p = paymentByReference.payment;
      const normalized = normalizePaymentState(p.status);
      if (normalized === "approved") block = copy.aprobado;
      if (normalized === "pending") block = copy.pendiente;
      if (normalized === "rejected") block = copy.rechazado;
      paymentDetails = {
        payment_id: p.id,
        status: p.status,
        status_detail: p.status_detail,
        external_reference: p.external_reference,
      };
    }
  }

  const title = block?.title ?? "Resultado del pago";
  const body = block?.body ?? "Volviste desde Mercado Pago. Si completaste un pago, la confirmacion puede tardar unos instantes. Si tienes dudas, contactanos.";

  const borderClass =
    block?.tone === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : block?.tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-neutral-200 bg-white";

  return (
    <div className="mx-auto max-w-lg px-4 py-20 md:px-6">
      <h1 className="font-display text-center text-2xl font-semibold text-ink">{title}</h1>
      <div className={`mt-6 border px-5 py-4 text-sm leading-relaxed text-ink-muted ${borderClass}`}>
        <p>{body}</p>
        {paymentDetails ? (
          <dl className="mt-4 space-y-1 border-t border-neutral-200 pt-4 text-xs">
            <div>
              <dt className="inline font-semibold text-ink">Pago:</dt>{" "}
              <dd className="inline">{paymentDetails.payment_id}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Estado tecnico:</dt>{" "}
              <dd className="inline">{paymentDetails.status}</dd>
            </div>
            {paymentDetails.status_detail ? (
              <div>
                <dt className="inline font-semibold text-ink">Detalle:</dt>{" "}
                <dd className="inline">{paymentDetails.status_detail}</dd>
              </div>
            ) : null}
            {paymentDetails.external_reference ? (
              <div>
                <dt className="inline font-semibold text-ink">Referencia:</dt>{" "}
                <dd className="inline">{paymentDetails.external_reference}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
      <p className="mt-6 text-center text-xs text-ink-muted">
        Próximos pasos en el roadmap: confirmación por API, comprobante y seguimiento del pedido desde el webhook de Mercado Pago.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/tienda"
          className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Ir a la tienda
        </Link>
        <Link
          href="/contacto"
          className="inline-flex items-center justify-center border border-neutral-300 px-6 py-3 text-sm font-medium text-ink hover:border-ink"
        >
          Contacto
        </Link>
        <Link href="/" className="inline-flex items-center justify-center text-sm text-ink-muted underline hover:text-ink">
          Inicio
        </Link>
      </div>
    </div>
  );
}
