import { NextResponse } from "next/server";
import products from "@/content/products.json";
import type { StoreProduct } from "@/lib/products";
import { exigirGerencia, rolActual } from "@/lib/sesion";
import { puedeCobrarAqui } from "@/lib/pagos/procesar";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import { borrarOrdenSinPago, crearOrdenId, guardarOrdenNueva, ponerPreferencia, type ItemOrden } from "@/lib/pagos/ordenes";
import { crearPreferencia } from "@/lib/pagos/preferencia";

export const runtime = "nodejs";

/** Valor fijo de la página de prueba de pago (solo gerencia). */
const VALOR_PRUEBA = 5000;

/**
 * POST /api/payments/mercadopago/preference   { producto: "<id de la tienda>" }  o  { prueba: true }
 * Crea el cobro de la tienda en Checkout Pro. El precio sale del catálogo del servidor
 * (content/products.json), nunca del navegador (W5).
 */
export async function POST(request: Request) {
  if (!(await dentroDelLimite(`preferencia:${ipDe(request)}`, 30, 3600))) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un rato e intenta de nuevo." }, { status: 429 });
  }
  let body: { producto?: unknown; prueba?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.prueba !== true && !(await puedeCobrarAqui(rolActual))) {
    return NextResponse.json({ error: "En la vista previa solo gerencia puede probar pagos." }, { status: 403 });
  }

  let items: ItemOrden[];
  let referencia: string | null;
  if (body.prueba === true) {
    const negado = await exigirGerencia();
    if (negado) return negado;
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_PAYMENT_TEST_PAGE !== "true") {
      return NextResponse.json({ error: "La página de prueba está apagada." }, { status: 404 });
    }
    items = [{ title: "Pedido de prueba — Hechomadera", quantity: 1, unit_price: VALOR_PRUEBA, currency_id: "COP" }];
    referencia = "prueba";
  } else {
    const producto = (products as StoreProduct[]).find((p) => typeof body.producto === "string" && p.id === body.producto);
    if (!producto || !Number.isSafeInteger(producto.priceCOP) || producto.priceCOP <= 0) {
      return NextResponse.json({ error: "Ese producto no está disponible." }, { status: 400 });
    }
    items = [{ title: `Pedido — ${producto.name}`, quantity: 1, unit_price: producto.priceCOP, currency_id: "COP" }];
    referencia = `tienda-${producto.id}`.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
  }

  const orderId = crearOrdenId();
  if (!(await guardarOrdenNueva({ id: orderId, tipo: "tienda", lead_id: null, referencia, items }))) {
    return NextResponse.json({ error: "No pudimos preparar el pago. Intenta de nuevo." }, { status: 500 });
  }
  const pref = await crearPreferencia({ ordenId: orderId, items });
  if (!pref.ok) {
    await borrarOrdenSinPago(orderId);
    return NextResponse.json({ error: pref.error }, { status: pref.status });
  }
  await ponerPreferencia(orderId, pref.preferenciaId, pref.url);
  return NextResponse.json({ ok: true, order_id: orderId, redirect_url: pref.url });
}
