import { after, NextResponse } from "next/server";
import { normalizePaymentState } from "@/lib/mercadopago";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook-signature";
import { getOrder } from "@/lib/pagos/ordenes";
import { procesarPagoMP } from "@/lib/pagos/procesar";
import { problemaYaRegistrado, saveWebhookEvent, vecesRegistrado } from "@/lib/webhook-events";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import {
  avisarPagoLead,
  avisarPagoParaRevisar,
  sendNewOrderAlertToSeller,
  sendPaymentConfirmationToBuyer,
} from "@/lib/email-notifications";
import { enviarPendientes } from "@/lib/integracion/salida";

export const runtime = "nodejs";

/** Avisos por minuto desde una misma IP (Mercado Pago manda pocos; frena a quien quiera llenar el registro). */
const LIMITE_POR_MINUTO = 120;

/**
 * POST /api/payments/mercadopago/webhook
 * Avisos de Mercado Pago. El pago se vuelve a consultar en la API de Mercado Pago y la base
 * decide (monto, cobro vigente, repetidos, efecto en el lead). Si algo pasajero falla, responde 500
 * para que Mercado Pago reintente; lo que no tiene arreglo responde 200, queda en el registro y,
 * si había plata de por medio, se avisa a gerencia por correo.
 */
export async function POST(request: Request) {
  if (!(await dentroDelLimite(`webhook-mp:${ipDe(request)}`, LIMITE_POR_MINUTO))) {
    return NextResponse.json({ received: false }, { status: 429 });
  }
  const url = new URL(request.url);
  const texto = await request.text().catch(() => "");
  if (texto.length > 20_000) return NextResponse.json({ error: "Cuerpo demasiado grande" }, { status: 413 });
  let body: { action?: string; type?: string; topic?: string; data?: { id?: string | number }; id?: string | number } = {};
  try {
    body = texto ? JSON.parse(texto) : {};
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const eventType = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "unknown").slice(0, 60);
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
  // La firma obligatoria aplica en producción. La seguridad real no depende de ella: cada pago se vuelve a
  // consultar en la API de Mercado Pago con nuestra credencial.
  if (!firma.ok && process.env.MERCADOPAGO_WEBHOOK_ENFORCE === "true" && process.env.VERCEL_ENV === "production") {
    await saveWebhookEvent({ ...base, ...vacio, processed: false, error: errorFirma });
    return NextResponse.json({ received: false, error: "Invalid webhook signature" }, { status: 401 });
  }

  if (eventType !== "payment" || !/^\d{1,20}$/.test(resourceId)) {
    await saveWebhookEvent({ ...base, ...vacio, processed: false, error: errorFirma });
    return NextResponse.json({ received: true, processed: false }, { status: 200 });
  }

  const r = await procesarPagoMP(resourceId);
  const p = r.pago;
  const registrado = await saveWebhookEvent({
    ...base,
    processed: r.ok,
    payment_id: p?.id ?? null,
    order_id: p?.external_reference ?? null,
    status: p?.status ?? null,
    normalized_status: p ? normalizePaymentState(p.status) : null,
    status_detail: p?.status_detail ?? null,
    error: r.ok ? (r.registro.ok ? (r.registro.alerta ?? errorFirma) : (r.registro.motivo ?? "rechazado_por_la_base")) : r.error,
  });

  // Las alertas de la base salen una sola vez (al cambiar de estado); las de aquí se revisan en el registro.
  let alerta = r.ok ? r.registro.alerta : r.alerta;
  if (!r.ok && alerta && p?.id && (await problemaYaRegistrado(p.id, r.error))) alerta = undefined;
  if (r.ok && !r.registro.ok && alerta && p?.id && (await problemaYaRegistrado(p.id, r.registro.motivo ?? "rechazado_por_la_base"))) alerta = undefined;
  // Supabase no pudo ni guardar el aviso de un pago aprobado: el correo (que no depende de Supabase) sale igual.
  if (!registrado && p?.status === "approved") alerta = alerta ?? "error_base";
  // Si la base falla con el mismo pago una y otra vez, Mercado Pago se cansa de reintentar: se avisa al tercer intento.
  if (!r.ok && r.error.startsWith("base:") && p?.id && p.status === "approved" && (await vecesRegistrado(p.id, r.error)) === 3) {
    alerta = "error_base";
  }
  const leadId = r.ok ? r.registro.lead_id : undefined;
  const nuevo = r.ok && r.registro.nuevo_aprobado ? r.registro : null;

  // Correos y Operflow después de responder, para que Mercado Pago no espere.
  if (alerta || nuevo) {
    after(async () => {
      try {
        if (alerta) {
          await avisarPagoParaRevisar({ alerta, mpPagoId: p?.id ?? null, monto: p?.transaction_amount ?? null, leadId });
        }
        if (nuevo && p) {
          if (nuevo.tipo === "tienda") {
            const order = await getOrder(p.external_reference ?? "");
            if (!order) return;
            const buyerName = p.payer?.first_name ? `${p.payer.first_name}${p.payer.last_name ? ` ${p.payer.last_name}` : ""}`.trim() : undefined;
            if (p.payer?.email) await sendPaymentConfirmationToBuyer({ order, buyerEmail: p.payer.email, buyerName });
            await sendNewOrderAlertToSeller({ order, buyerEmail: p.payer?.email, buyerName });
          } else if (nuevo.lead_id && nuevo.tipo) {
            await enviarPendientes({ leadId: nuevo.lead_id });
            await avisarPagoLead({ leadId: nuevo.lead_id, tipo: nuevo.tipo, monto: Number(p.transaction_amount ?? 0) });
          }
        }
      } catch (e) {
        console.error("[Mercado Pago webhook] fallo después de responder", e instanceof Error ? e.message : "error");
      }
    });
  }

  if (!r.ok) {
    console.warn("[Mercado Pago webhook] no procesado", { resourceId, error: r.error });
    return NextResponse.json({ received: true, processed: false }, { status: r.reintentar ? 500 : 200 });
  }
  return NextResponse.json({ received: true, processed: true }, { status: 200 });
}

/** Comprobación rápida desde el navegador o health checks. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "mercadopago-webhook", hint: "Las notificaciones reales usan POST desde Mercado Pago." });
}
