import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { listOrders } from "@/lib/orders-store";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders?limit=50&status=approved&token=...
 * API interna para operación (protegida por ADMIN_API_TOKEN).
 */
export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const status = url.searchParams.get("status");
  const all = await listOrders(limit);
  const orders = status ? all.filter((o) => o.status === status) : all;

  return NextResponse.json({
    ok: true,
    count: orders.length,
    orders,
  });
}
