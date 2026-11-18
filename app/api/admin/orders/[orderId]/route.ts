import { NextResponse } from "next/server";
import { exigirGerencia } from "@/lib/sesion";
import { getOrder } from "@/lib/orders-store";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders/:orderId
 * Detalle de orden para operación interna.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const negado = await exigirGerencia();
  if (negado) return negado;

  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Orden no encontrada", order_id: orderId }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}
