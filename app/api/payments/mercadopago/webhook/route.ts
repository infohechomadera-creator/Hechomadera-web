import { NextResponse } from "next/server";
import { fetchMercadoPagoPayment, normalizePaymentState } from "@/lib/mercadopago";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook-signature";
import { updateOrderFromPayment } from "@/lib/orders-store";
import { markPaymentProcessed, saveWebhookEvent } from "@/lib/webhook-events";
import { sendPaymentConfirmationToBuyer, sendNewOrderAlertToSeller } from "@/lib/email-notifications";

export const runtime = "nodejs";

/**
 * POST /api/payments/mercadopago/webhook
 *
 * Punto de entrada para notificaciones de Mercado Pago (IPN / webhooks).
 * En el panel de MP: URL de notificación = `{NEXT_PUBLIC_SITE_URL}/api/payments/mercadopago/webhook`
 *
 * Fase actual: responde 200 y registra el cuerpo en logs (Vercel → Functions → Logs).
 * Siguiente: validar firma si aplica, consultar API de MP con el id, actualizar pedido en BD.
 *
 * @see https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let payload: unknown;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const body = payload as {
    action?: string;
    type?: string;
    topic?: string;
    data?: { id?: string | number };
    id?: string | number;
  };

  const eventType = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "unknown";
  const rawId = body.data?.id ?? body.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const resourceId = rawId != null ? String(rawId) : "";
  const baseEvent = {
    provider: "mercadopago" as const,
    event_type: eventType,
    action: body.action ?? null,
    resource_id: resourceId || null,
    received_at: new Date().toISOString(),
  };
  const enforceSignature = process.env.MERCADOPAGO_WEBHOOK_ENFORCE === "true";
  const signatureValidation = validateMercadoPagoWebhookSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestIdHeader: request.headers.get("x-request-id"),
    resourceId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  });
  const signatureError = signatureValidation.ok
    ? null
    : `signature_invalid:${signatureValidation.reason ?? "unknown"}`;

  if (!signatureValidation.ok) {
    if (enforceSignature) {
      await saveWebhookEvent({
        ...baseEvent,
        processed: false,
        payment_id: null,
        order_id: null,
        status: null,
        normalized_status: null,
        status_detail: null,
        error: signatureError,
      });
      console.warn("[Mercado Pago webhook] rejected by signature", {
        eventType,
        resourceId: resourceId || null,
        reason: signatureValidation.reason ?? "unknown",
      });
      return NextResponse.json({ received: false, error: "Invalid webhook signature" }, { status: 401 });
    }

    console.warn("[Mercado Pago webhook] signature not valid (soft mode)", {
      eventType,
      resourceId: resourceId || null,
      reason: signatureValidation.reason ?? "unknown",
    });
  }

  // Keep webhook idempotent/safe: always return 200 after processing/logging.
  if (eventType === "payment" && resourceId) {
    const result = await fetchMercadoPagoPayment(resourceId);
    if (!result.ok) {
      await saveWebhookEvent({
        ...baseEvent,
        processed: false,
        payment_id: null,
        order_id: null,
        status: null,
        normalized_status: null,
        status_detail: null,
        error: signatureError ?? `${result.status}: ${result.error}`,
      });
      console.error("[Mercado Pago webhook] payment fetch failed", {
        eventType,
        resourceId,
        status: result.status,
        error: result.error,
        details: result.details,
      });
      return NextResponse.json({ received: true, processed: false }, { status: 200 });
    }

    const p = result.payment;
    let updatedOrder = null;
    if (p.external_reference) {
      updatedOrder = await updateOrderFromPayment({
        orderId: p.external_reference,
        payment: {
          id: p.id,
          status: p.status,
          status_detail: p.status_detail,
          date_created: p.date_created,
          date_approved: p.date_approved ?? null,
          payment_method_id: p.payment_method_id,
        },
      });
    }
    const dedupe = markPaymentProcessed(p.id ?? null);
    const normalizedStatus = normalizePaymentState(p.status);
    await saveWebhookEvent({
      ...baseEvent,
      processed: true,
      payment_id: p.id ?? null,
      order_id: p.external_reference ?? null,
      status: p.status ?? null,
      normalized_status: normalizedStatus,
      status_detail: p.status_detail ?? null,
      error: signatureError,
    });

    // Enviar emails de confirmación solo en pagos aprobados y no duplicados
    if (normalizedStatus === "approved" && !dedupe.alreadyProcessed && updatedOrder) {
      const buyerEmail = p.payer?.email;
      const buyerFirstName = p.payer?.first_name;
      const buyerName = buyerFirstName
        ? `${buyerFirstName}${p.payer?.last_name ? ` ${p.payer.last_name}` : ""}`.trim()
        : undefined;

      if (buyerEmail) {
        sendPaymentConfirmationToBuyer({
          order: updatedOrder,
          buyerEmail,
          buyerName,
        }).catch((err) => console.error("[webhook] error email comprador:", err));
      }

      sendNewOrderAlertToSeller({
        order: updatedOrder,
        buyerEmail,
        buyerName,
      }).catch((err) => console.error("[webhook] error email vendedor:", err));
    }

    console.info("[Mercado Pago webhook] payment event", {
      eventType,
      action: body.action ?? null,
      payment_id: p.id,
      status: p.status,
      normalized_status: normalizedStatus,
      status_detail: p.status_detail ?? null,
      external_reference: p.external_reference ?? null,
      transaction_amount: p.transaction_amount ?? null,
      currency_id: p.currency_id ?? null,
      payment_method_id: p.payment_method_id ?? null,
      date_created: p.date_created ?? null,
      date_approved: p.date_approved ?? null,
      duplicate_event: dedupe.alreadyProcessed,
      dedupe_key: dedupe.dedupeKey,
    });
    return NextResponse.json({ received: true, processed: true }, { status: 200 });
  }

  await saveWebhookEvent({
    ...baseEvent,
    processed: false,
    payment_id: null,
    order_id: null,
    status: null,
    normalized_status: null,
    status_detail: null,
    error: signatureError,
  });

  console.info("[Mercado Pago webhook] unsupported event", {
    eventType,
    resourceId: resourceId || null,
    payload: body,
  });
  return NextResponse.json({ received: true, processed: false }, { status: 200 });
}

/** Comprobación rápida desde el navegador o health checks. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "mercadopago-webhook",
    hint: "Las notificaciones reales usan POST desde Mercado Pago.",
  });
}
