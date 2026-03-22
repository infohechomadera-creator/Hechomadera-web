import { NextResponse } from "next/server";

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

  let body: { items?: Item[]; title?: string; unit_price?: number; quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

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

  const preference = {
    items: items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      currency_id: "COP",
    })),
    back_urls: {
      success: `${baseUrl}/pago/resultado?estado=aprobado`,
      failure: `${baseUrl}/pago/resultado?estado=rechazado`,
      pending: `${baseUrl}/pago/resultado?estado=pendiente`,
    },
    auto_return: "approved",
    statement_descriptor: "HECHOMADERA",
    external_reference: `web-${Date.now()}`,
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
    preference_id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
    /** Usar esta URL para redirigir al usuario */
    redirect_url: payUrl,
  });
}
