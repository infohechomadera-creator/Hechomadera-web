import { NextResponse } from "next/server";
import { ErrorPrecio, calcularRango } from "@/lib/precios/calcular";
import { obtenerPrecios } from "@/lib/precios/fuente";
import { validarConfiguracion } from "@/lib/configurador/validar";
import { dentroDelLimite, ipDe } from "@/lib/limite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE_RANGO_POR_MINUTO = 30;

/**
 * POST /api/configurador/rango (público). Calcula el rango de la cocina con los precios
 * vigentes de la ciudad. No guarda nada: el lead se crea en /api/configurador/lead.
 */
export async function POST(request: Request) {
  const sinCache = { "Cache-Control": "no-store" };
  if (!(await dentroDelLimite(`config-rango:${ipDe(request)}`, LIMITE_RANGO_POR_MINUTO))) {
    return NextResponse.json({ error: "Demasiadas consultas; espera un minuto" }, { status: 429, headers: sinCache });
  }
  let datos: unknown;
  try {
    datos = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400, headers: sinCache });
  }
  const { tablas } = await obtenerPrecios();
  const config = validarConfiguracion(datos, tablas);
  if (!config.ok) return NextResponse.json({ error: config.error, campo: config.campo }, { status: 400, headers: sinCache });
  try {
    const r = calcularRango(tablas[config.valor.ciudad], config.valor);
    return NextResponse.json(
      { ok: true, rango: { min: r.min, max: r.max, ciudad: r.ciudad, vigente_desde: r.vigente_desde } },
      { headers: sinCache },
    );
  } catch (e) {
    if (e instanceof ErrorPrecio) {
      return NextResponse.json({ error: e.message, campo: e.campo }, { status: 400, headers: sinCache });
    }
    return NextResponse.json({ error: "No pudimos calcular el rango" }, { status: 500, headers: sinCache });
  }
}
