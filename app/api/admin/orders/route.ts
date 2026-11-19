import { NextResponse } from "next/server";
import { exigirGerencia } from "@/lib/sesion";
import { listOrders } from "@/lib/pagos/ordenes";
import { clienteUsuario } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders?limit=50&status=approved
 * API interna para operación (solo gerencia, con sesión de Supabase).
 */
export async function GET(request: Request) {
  const negado = await exigirGerencia();
  if (negado) return negado;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const status = url.searchParams.get("status");
  const all = await listOrders(await clienteUsuario(), limit);
  const orders = status ? all.filter((o) => o.status === status) : all;

  return NextResponse.json({
    ok: true,
    count: orders.length,
    orders,
  });
}
