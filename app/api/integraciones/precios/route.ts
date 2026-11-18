import { NextResponse } from "next/server";
import { LIMITE_IP_POR_MINUTO, claveValida, dentroDelLimite, ipDe, registrarEvento, respuestaPrecios } from "@/lib/integracion/operflow";
import { clienteSistema } from "@/lib/supabase/servidor";
import { CIUDADES_ACTIVAS, type CiudadActiva, type TablaPrecios } from "@/lib/precios/tipos";
import { validarTablaPrecios } from "@/lib/precios/validar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mensaje D del contrato: Operflow → Web "consultar precios" (solo lectura).
 * GET /api/integraciones/precios?ciudad=Santa%20Marta   Authorization: Bearer <OPERFLOW_API_KEY>
 * Responde los precios vigentes de esa ciudad con su fecha de vigencia y el id de versión,
 * para que Operflow guarde en cada cotización qué versión usó.
 */
export async function GET(request: Request) {
  const responder = async (estado: number, cuerpo: object, detalle?: string) => {
    await registrarEvento({ direccion: "entrada", mensaje: "D", estado_http: estado, detalle });
    return NextResponse.json(cuerpo, { status: estado, headers: { "Cache-Control": "no-store" } });
  };

  if (!process.env.OPERFLOW_API_KEY) {
    return NextResponse.json({ error: "Integración no configurada" }, { status: 503 });
  }
  // Primero el límite por IP, sin escribir en la base: así nadie llena el registro ni adivina la clave.
  if (!(await dentroDelLimite(`ip:${ipDe(request)}`, LIMITE_IP_POR_MINUTO))) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes; intenta en un minuto" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!claveValida(request.headers.get("authorization"), process.env.OPERFLOW_API_KEY)) {
    return responder(401, { error: "Clave incorrecta" }, "clave inválida");
  }
  if (!(await dentroDelLimite("operflow"))) {
    return responder(429, { error: "Demasiadas solicitudes; intenta en un minuto" });
  }

  const ciudad = new URL(request.url).searchParams.get("ciudad") ?? "";
  if (!CIUDADES_ACTIVAS.includes(ciudad as CiudadActiva)) {
    return responder(400, { error: "Ciudad no válida", campos: ["ciudad"], ciudades: CIUDADES_ACTIVAS }, `ciudad=${ciudad.slice(0, 40)}`);
  }

  try {
    const { data, error } = await clienteSistema()
      .from("precios_vigentes")
      .select("id, datos")
      .eq("ciudad", ciudad)
      .maybeSingle();
    if (error) return responder(500, { error: "No se pudieron leer los precios" }, "error de base");
    if (!data || validarTablaPrecios(data.datos).length) {
      return responder(404, { error: "La ciudad no tiene precios vigentes" }, `ciudad=${ciudad}`);
    }
    return responder(200, respuestaPrecios(data.datos as TablaPrecios, data.id), `ciudad=${ciudad}`);
  } catch {
    return responder(500, { error: "No se pudieron leer los precios" }, "excepción");
  }
}
