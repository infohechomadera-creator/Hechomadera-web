import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getOrder } from "@/lib/orders-store";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders/:orderId?token=...
 * Detalle de orden para operación interna.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Orden no encontrada", order_id: orderId }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}
