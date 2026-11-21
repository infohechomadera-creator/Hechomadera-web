import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { LIMITE_IP_POR_MINUTO, registrarEvento } from "@/lib/integracion/operflow";
import { ENCABEZADO_FIRMA, firmaOperflowValida } from "@/lib/integracion/firma";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import { clienteSistema } from "@/lib/supabase/servidor";
import { avisarPagoParaRevisar } from "@/lib/email-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENTOS = ["etapa_cambiada", "propuesta_lista", "valor_ajustado", "entregado", "cancelado_tras_medicion"] as const;
const ID_EXTERNO = /^lead_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const MAX_CUERPO = 20_000;

const texto = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/**
 * Mensaje B del contrato: Operflow → Web "aviso de cambio".
 * POST /api/integraciones/operflow   X-Operflow-Firma: t=…,v1=…  (ver lib/integracion/firma.ts)
 * Solo se acepta firmado; el mismo aviso dos veces se responde 200 sin repetir nada.
 */
export async function POST(request: Request) {
  const responder = async (estado: number, cuerpo: object, detalle?: string) => {
    await registrarEvento({ direccion: "entrada", mensaje: "B", estado_http: estado, detalle });
    return NextResponse.json(cuerpo, { status: estado, headers: { "Cache-Control": "no-store" } });
  };

  if (!process.env.OPERFLOW_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Integración no configurada" }, { status: 503 });
  }
  if (!(await dentroDelLimite(`operflow-b-ip:${ipDe(request)}`, LIMITE_IP_POR_MINUTO))) {
    return NextResponse.json({ error: "Demasiadas solicitudes; intenta en un minuto" }, { status: 429 });
  }
  const cuerpo = await request.text().catch(() => "");
  if (cuerpo.length > MAX_CUERPO) return responder(413, { error: "Cuerpo demasiado grande" });
  const firma = firmaOperflowValida(request.headers.get(ENCABEZADO_FIRMA), cuerpo, process.env.OPERFLOW_WEBHOOK_SECRET);
  if (!firma.ok) return responder(401, { error: "Firma inválida" }, `firma ${firma.motivo}`);

  let aviso: Record<string, unknown>;
  try {
    aviso = JSON.parse(cuerpo);
  } catch {
    return responder(400, { error: "JSON inválido" });
  }
  const evento = aviso.evento as (typeof EVENTOS)[number];
  const lead = typeof aviso.id_externo === "string" ? aviso.id_externo.match(ID_EXTERNO)?.[1] : undefined;
  const datos = (typeof aviso.datos === "object" && aviso.datos ? aviso.datos : {}) as Record<string, unknown>;
  const fecha = typeof aviso.fecha === "string" ? new Date(aviso.fecha) : null;
  // Fecha válida y no del futuro (con 5 minutos de margen); si no, la de llegada.
  const fechaAviso =
    fecha && !Number.isNaN(fecha.getTime()) && fecha.getTime() <= Date.now() + 300_000 ? fecha.toISOString() : new Date().toISOString();
  const valor = datos.valor_final;
  const campos = [
    ...(EVENTOS.includes(evento) ? [] : ["evento"]),
    ...(lead ? [] : ["id_externo"]),
    ...(valor === undefined || valor === null || (Number.isSafeInteger(valor) && (valor as number) >= 0) ? [] : ["datos.valor_final"]),
  ];
  if (campos.length) return responder(400, { error: "Datos inválidos", campos }, campos.join(","));

  const huella = createHash("sha256").update(cuerpo).digest("hex");
  const { data, error } = await clienteSistema().rpc("registrar_aviso_operflow", {
    p_huella: huella,
    p_lead: lead,
    p_evento: evento,
    p_proyecto_id: texto(aviso.proyecto_id, 120),
    p_etapa: texto(aviso.etapa, 80),
    p_estado: texto(aviso.estado, 80),
    p_valor_final: typeof valor === "number" && valor > 0 ? valor : null,
    p_url_propuesta: texto(datos.url_propuesta, 500),
    // La fecha del aviso ordena los avisos: uno más viejo que el último aplicado no cambia nada.
    p_fecha: fechaAviso,
  });
  if (error) return responder(500, { error: "No se pudo registrar" }, "error de base");
  const r = data as { ok: boolean; repetido?: boolean; alerta?: string };
  if (!r.ok) return responder(404, { error: "No existe ese proyecto en la web" }, `lead ${lead!.slice(0, 8)}`);
  if (r.alerta) {
    await avisarPagoParaRevisar({ alerta: r.alerta, mpPagoId: null, monto: typeof valor === "number" ? valor : null, leadId: lead }).catch(
      () => undefined,
    );
  }
  return responder(200, { ok: true, repetido: Boolean(r.repetido) }, `${evento} lead ${lead!.slice(0, 8)}`);
}
