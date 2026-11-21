import { NextResponse } from "next/server";
import { claveValida } from "@/lib/integracion/operflow";
import { enviarPendientes } from "@/lib/integracion/salida";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tarea diaria de Vercel (vercel.json): reintenta los mensajes pendientes para Operflow.
 * Vercel manda `Authorization: Bearer <CRON_SECRET>`; sin ese secreto no hace nada.
 */
export async function GET(request: Request) {
  if (!claveValida(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await enviarPendientes({ limite: 50 });
  return NextResponse.json({ ok: true, ...r }, { headers: { "Cache-Control": "no-store" } });
}
