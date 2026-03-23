import { NextResponse } from "next/server";
import { createOrderId, sanitizeSourceReference } from "@/lib/orders";

export const runtime = "nodejs";

type Item = {
  title: string;
  quantity: number;
  unit_price: number;
};

/**
 * POST /api/payments/mercadopago/preference
 * Crea una preferencia de Checkout Pro (redirección a Mercado Pago).
 * Requiere MERCADOPAGO_ACCESS_TOKEN en Vercel (credencial de producción o prueba).
 *
 * Docs: https://www.mercadopago.com.co/developers/es/reference/preferences/_checkout_preferences/post
 */
export async function POST(request: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: "Falta MERCADOPAGO_ACCESS_TOKEN en variables de entorno (Vercel).",
        hint: "Obtén un token en Mercado Pago → Tus integraciones → Credenciales.",
      },
      { status: 503 },
    );
  }

  let body: {
    items?: Item[];
    title?: string;
    unit_price?: number;
    quantity?: number;
    /** Referencia opcional (conciliación); se sanea y trunca */
    external_reference?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const orderId = createOrderId();
  const sourceReference = sanitizeSourceReference(body.external_reference);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  let items: Item[];
  if (body.items?.length) {
    items = body.items.map((i) => ({
      title: String(i.title).slice(0, 256),
      quantity: Math.max(1, Math.min(999, Number(i.quantity) || 1)),
      unit_price: Math.max(0, Number(i.unit_price) || 0),
    }));
  } else if (body.title && body.unit_price != null) {
    items = [
      {
        title: String(body.title).slice(0, 256),
        quantity: Math.max(1, Math.min(999, Number(body.quantity) || 1)),
        unit_price: Math.max(0, Number(body.unit_price)),
      },
    ];
  } else {
    return NextResponse.json(
      { error: "Envía items[] o bien title + unit_price (+ quantity opcional)." },
      { status: 400 },
    );
  }

  if (items.some((i) => i.unit_price <= 0)) {
    return NextResponse.json({ error: "unit_price debe ser mayor a 0." }, { status: 400 });
  }

  const successUrl = `${baseUrl}/pago/resultado?estado=aprobado&order_id=${encodeURIComponent(orderId)}`;
  const failureUrl = `${baseUrl}/pago/resultado?estado=rechazado&order_id=${encodeURIComponent(orderId)}`;
  const pendingUrl = `${baseUrl}/pago/resultado?estado=pendiente&order_id=${encodeURIComponent(orderId)}`;

  const preference = {
    items: items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      currency_id: "COP",
    })),
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    auto_return: "approved",
    statement_descriptor: "HECHOMADERA",
    /**
     * external_reference se reserva para order_id propio.
     * Permite consultar estado por orden aunque el cliente no retorne con payment_id.
     */
    external_reference: orderId,
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });

  const data = (await res.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
    cause?: unknown;
  };

  if (!res.ok) {
    console.error("Mercado Pago preference error:", res.status, data);
    return NextResponse.json(
      {
        error: "Mercado Pago rechazó la preferencia.",
        details: data.message ?? data,
      },
      { status: 502 },
    );
  }

  const payUrl = data.sandbox_init_point ?? data.init_point;
  if (!payUrl) {
    return NextResponse.json({ error: "Respuesta sin URL de pago.", details: data }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    order_id: orderId,
    source_reference: sourceReference,
    preference_id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
    /** Usar esta URL para redirigir al usuario */
    redirect_url: payUrl,
  });
}
