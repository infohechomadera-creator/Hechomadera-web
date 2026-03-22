import { NextResponse } from "next/server";

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

  // Opcional: comprobar MERCADOPAGO_WEBHOOK_SECRET / headers de firma según doc de MP para tu integración.
  console.info("[Mercado Pago webhook]", JSON.stringify(payload));

  return NextResponse.json({ received: true }, { status: 200 });
}

/** Comprobación rápida desde el navegador o health checks. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "mercadopago-webhook",
    hint: "Las notificaciones reales usan POST desde Mercado Pago.",
  });
}
