import { NextResponse } from "next/server";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import { TOKEN, iniciarCobroLead } from "@/lib/pagos/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Intentos por hora desde una misma IP (frena a quien quiera adivinar enlaces). */
const LIMITE_POR_HORA = 20;

/**
 * POST /api/pagos/lead   { token }
 * Inicia el siguiente cobro del lead (diseño, anticipo o saldo). El valor lo calcula el
 * servidor; el navegador solo manda el código del enlace.
 */
export async function POST(request: Request) {
  if (!(await dentroDelLimite(`pago-lead:${ipDe(request)}`, LIMITE_POR_HORA, 3600))) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un rato e intenta de nuevo." }, { status: 429 });
  }
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    // cuerpo inválido: se trata como enlace inexistente
  }
  if (!TOKEN.test(token)) return NextResponse.json({ error: "Este enlace de pago no existe." }, { status: 404 });
  const r = await iniciarCobroLead(token);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, redirect_url: r.url }, { headers: { "Cache-Control": "no-store" } });
}
