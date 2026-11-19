import { after, NextResponse } from "next/server";
import { normalizePaymentState } from "@/lib/mercadopago";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook-signature";
import { getOrder } from "@/lib/pagos/ordenes";
import { procesarPagoMP } from "@/lib/pagos/procesar";
import { saveWebhookEvent } from "@/lib/webhook-events";
import { avisarPagoLead, sendNewOrderAlertToSeller, sendPaymentConfirmationToBuyer } from "@/lib/email-notifications";
import { enviarPendientes } from "@/lib/integracion/salida";

export const runtime = "nodejs";

/**
 * POST /api/payments/mercadopago/webhook
 * Avisos de Mercado Pago. El pago se vuelve a consultar en la API de Mercado Pago y la base
 * decide (monto, repetidos, efecto en el lead). Si algo pasajero falla, responde 500 para que
 * Mercado Pago reintente; lo que no tiene arreglo responde 200 y queda en el registro.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const texto = await request.text().catch(() => "");
  let body: { action?: string; type?: string; topic?: string; data?: { id?: string | number }; id?: string | number } = {};
  try {
    body = texto ? JSON.parse(texto) : {};
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const eventType = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "unknown");
  const rawId = body.data?.id ?? body.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const resourceId = rawId != null ? String(rawId).replace(/[^\w-]/g, "").slice(0, 60) : "";
  const base = {
    provider: "mercadopago" as const,
    event_type: eventType,
    action: body.action ?? null,
    resource_id: resourceId || null,
    received_at: new Date().toISOString(),
  };
  const vacio = { payment_id: null, order_id: null, status: null, normalized_status: null, status_detail: null };

  const firma = validateMercadoPagoWebhookSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestIdHeader: request.headers.get("x-request-id"),
    resourceId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  });
  const errorFirma = firma.ok ? null : `signature_invalid:${firma.reason ?? "unknown"}`;
  if (!firma.ok && process.env.MERCADOPAGO_WEBHOOK_ENFORCE === "true") {
    await saveWebhookEvent({ ...base, ...vacio, processed: false, error: errorFirma });
    return NextResponse.json({ received: false, error: "Invalid webhook signature" }, { status: 401 });
  }

  if (eventType !== "payment" || !/^\d{1,20}$/.test(resourceId)) {
    await saveWebhookEvent({ ...base, ...vacio, processed: false, error: errorFirma });
    return NextResponse.json({ received: true, processed: false }, { status: 200 });
  }

  const r = await procesarPagoMP(resourceId);
  const p = r.pago;
  await saveWebhookEvent({
    ...base,
    processed: r.ok,
    payment_id: p?.id ?? null,
    order_id: p?.external_reference ?? null,
    status: p?.status ?? null,
    normalized_status: p ? normalizePaymentState(p.status) : null,
    status_detail: p?.status_detail ?? null,
    error: r.ok ? (r.registro.ok ? errorFirma : (r.registro.motivo ?? "rechazado_por_la_base")) : r.error,
  });
  if (!r.ok) {
    console.warn("[Mercado Pago webhook] no procesado", { resourceId, error: r.error });
    return NextResponse.json({ received: true, processed: false }, { status: r.reintentar ? 500 : 200 });
  }

  const reg = r.registro;
  if (reg.nuevo_aprobado) {
    const pago = r.pago;
    // Correos y Operflow después de responder, para que Mercado Pago no espere.
    after(async () => {
      try {
        if (reg.tipo === "tienda") {
          const order = await getOrder(pago.external_reference ?? "");
          if (!order) return;
          const buyerName = pago.payer?.first_name
            ? `${pago.payer.first_name}${pago.payer.last_name ? ` ${pago.payer.last_name}` : ""}`.trim()
            : undefined;
          if (pago.payer?.email) await sendPaymentConfirmationToBuyer({ order, buyerEmail: pago.payer.email, buyerName });
          await sendNewOrderAlertToSeller({ order, buyerEmail: pago.payer?.email, buyerName });
        } else if (reg.lead_id && reg.tipo) {
          await enviarPendientes({ leadId: reg.lead_id });
          await avisarPagoLead({ leadId: reg.lead_id, tipo: reg.tipo, monto: Number(pago.transaction_amount ?? 0) });
        }
      } catch (e) {
        console.error("[Mercado Pago webhook] fallo después de responder", e instanceof Error ? e.message : "error");
      }
    });
  }
  return NextResponse.json({ received: true, processed: true }, { status: 200 });
}

/** Comprobación rápida desde el navegador o health checks. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "mercadopago-webhook", hint: "Las notificaciones reales usan POST desde Mercado Pago." });
}
