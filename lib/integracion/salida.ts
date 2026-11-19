/**
 * Bandeja de salida a Operflow (W5), según docs/CONTRATO-INTEGRACION.md:
 *  A · crear proyecto con brief (al pagar el diseño)   POST {OPERFLOW_URL}/api/v1/proyectos
 *  C · pago registrado (anticipo o saldo)              POST {OPERFLOW_URL}/api/v1/proyectos/{id_externo}/pagos
 *  E · no aprobó: entregar y borrar                    POST {OPERFLOW_URL}/api/v1/proyectos/{id_externo}/eliminar
 * La base deja el mensaje "pendiente"; aquí se arma el cuerpo (con los datos de ese momento) y se
 * envía. Si Operflow no está conectado o falla, queda pendiente y se reintenta (botón o tarea diaria).
 * Operflow no duplica: el `id_externo` es el mismo en cada intento.
 */
import { clienteSistema } from "@/lib/supabase/servidor";
import { CUBETA_FOTOS } from "@/lib/configurador/guardar";
import { registrarEvento } from "@/lib/integracion/operflow";
import type { ConfiguracionGuardada } from "@/lib/leads";

export const SIN_CONEXION = "Operflow aún no está conectado (faltan OPERFLOW_URL u OPERFLOW_API_KEY).";
const MAX_INTENTOS = 12;
/** Los enlaces de las fotos viven 15 minutos: Operflow las copia al recibirlas. */
const VIDA_FOTOS_SEG = 900;

export const idExterno = (leadId: string) => `lead_${leadId}`;

type Mensaje = { id: number; lead_id: string; mensaje: "A" | "C" | "E"; pago_id: number | null; intentos: number };

export type LeadParaA = {
  id: string;
  producto: string;
  ciudad: string;
  rango_min: number | null;
  rango_max: number | null;
  configuracion: ConfiguracionGuardada & { notas_cliente?: string };
  clientes: { nombre: string; telefono: string | null; email: string | null; direccion: string | null } | null;
  asesor: { email: string } | null;
};

export function cuerpoA(
  lead: LeadParaA,
  fotos: string[],
  pago: { valor: number; referencia: string; fecha: string } | null,
) {
  const c = lead.configuracion ?? {};
  return {
    id_externo: idExterno(lead.id),
    producto: lead.producto,
    ciudad: lead.ciudad,
    cliente: {
      nombre: lead.clientes?.nombre ?? "",
      telefono: lead.clientes?.telefono ?? "",
      email: lead.clientes?.email ?? "",
      direccion: lead.clientes?.direccion ?? "",
    },
    asesor_email: lead.asesor?.email ?? "",
    configuracion: {
      forma: c.forma ?? "",
      diseno_base: c.diseno ?? "",
      colores: { cuerpos: c.color ?? "", frentes: c.color ?? "" },
      herrajes: c.herrajes ?? "",
      electrodomesticos: c.electrodomesticos ?? [],
      medidas_aprox_mm: c.medidas_mm ?? {},
      notas_cliente: c.notas_cliente ?? "",
    },
    rango_precio: { min: lead.rango_min ?? 0, max: lead.rango_max ?? 0, moneda: "COP" },
    archivos: fotos.map((url) => ({ tipo: "foto_espacio", url })),
    pago_diseno: pago ? { valor: pago.valor, moneda: "COP", referencia: pago.referencia, fecha: pago.fecha } : null,
  };
}

export const referenciaPago = (p: { mp_pago_id: number | null; orden_id: string }) =>
  p.mp_pago_id ? `mp_${p.mp_pago_id}` : `manual_${p.orden_id}`;

/** Qué hacer con la respuesta de Operflow. */
export function decidir(status: number, intentos: number): { estado: "enviado" | "pendiente" | "fallido"; error: string | null; esperaMin: number } {
  if (status >= 200 && status < 300) return { estado: "enviado", error: null, esperaMin: 0 };
  const siguiente = intentos + 1;
  if (status === 400 || status === 422) return { estado: "fallido", error: `Operflow rechazó los datos (${status}). Revisar.`, esperaMin: 0 };
  if (siguiente >= MAX_INTENTOS) return { estado: "fallido", error: `Operflow no respondió bien tras ${siguiente} intentos (${status || "sin conexión"}).`, esperaMin: 0 };
  const error =
    status === 401 || status === 403 ? `Operflow no aceptó la clave (${status}).` : status === 0 ? "Sin conexión con Operflow." : `Operflow respondió ${status}.`;
  return { estado: "pendiente", error, esperaMin: Math.min(24 * 60, 5 * 2 ** intentos) };
}

async function llamar(ruta: string, cuerpo: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const base = (process.env.OPERFLOW_URL ?? "").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}${ruta}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPERFLOW_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, json };
  } catch {
    return { status: 0, json: {} };
  }
}

async function armar(m: Mensaje): Promise<{ ruta: string; cuerpo: unknown } | null> {
  const db = clienteSistema();
  const ide = encodeURIComponent(idExterno(m.lead_id));
  if (m.mensaje === "E") return { ruta: `/api/v1/proyectos/${ide}/eliminar`, cuerpo: {} };
  if (m.mensaje === "C") {
    const { data: p } = await db
      .from("pagos")
      .select("tipo, monto, mp_pago_id, orden_id, pagado_at, creado_at")
      .eq("id", m.pago_id ?? -1)
      .maybeSingle();
    if (!p) return null;
    return {
      ruta: `/api/v1/proyectos/${ide}/pagos`,
      cuerpo: { tipo: p.tipo, valor: Number(p.monto), moneda: "COP", referencia: referenciaPago(p), fecha: p.pagado_at ?? p.creado_at },
    };
  }
  const { data: lead } = await db
    .from("leads")
    .select("id, producto, ciudad, rango_min, rango_max, configuracion, asesor_id, clientes(nombre, telefono, email, direccion), archivos(ruta)")
    .eq("id", m.lead_id)
    .maybeSingle<Omit<LeadParaA, "asesor"> & { asesor_id: string | null; archivos: { ruta: string }[] }>();
  if (!lead) return null;
  const [{ data: asesor }, { data: pago }] = await Promise.all([
    lead.asesor_id
      ? db.from("perfiles").select("email").eq("id", lead.asesor_id).maybeSingle<{ email: string }>()
      : Promise.resolve({ data: null }),
    db
      .from("pagos")
      .select("monto, mp_pago_id, orden_id, pagado_at, creado_at")
      .eq("lead_id", m.lead_id)
      .eq("tipo", "diseno")
      .eq("cuenta", true)
      .limit(1)
      .maybeSingle(),
  ]);
  const rutas = (lead.archivos ?? []).map((a) => a.ruta);
  let fotos: string[] = [];
  if (rutas.length) {
    const { data } = await db.storage.from(CUBETA_FOTOS).createSignedUrls(rutas, VIDA_FOTOS_SEG);
    fotos = (data ?? []).flatMap((f) => (f.signedUrl ? [f.signedUrl] : []));
  }
  return {
    ruta: "/api/v1/proyectos",
    cuerpo: cuerpoA(
      { ...lead, asesor: asesor ?? null },
      fotos,
      pago ? { valor: Number(pago.monto), referencia: referenciaPago(pago), fecha: pago.pagado_at ?? pago.creado_at } : null,
    ),
  };
}

/**
 * Envía los mensajes pendientes (de un lead o de todos). `forzar` ignora la espera entre
 * intentos (botón "Reenviar"). Devuelve cuántos quedaron enviados y pendientes.
 */
export async function enviarPendientes({ leadId, forzar = false, limite = 20 }: { leadId?: string; forzar?: boolean; limite?: number } = {}) {
  const db = clienteSistema();
  const ahora = new Date().toISOString();
  let q = db.from("mensajes_operflow").select("id, lead_id, mensaje, pago_id, intentos").eq("estado", "pendiente").order("id").limit(limite);
  if (leadId) q = q.eq("lead_id", leadId);
  if (!forzar) q = q.lte("proximo_intento_at", ahora);
  const { data: mensajes } = await q.returns<Mensaje[]>();
  const resultado = { enviados: 0, pendientes: 0, fallidos: 0, conectado: true };
  if (!mensajes?.length) return resultado;

  if (!process.env.OPERFLOW_URL || !process.env.OPERFLOW_API_KEY) {
    await db.from("mensajes_operflow").update({ ultimo_error: SIN_CONEXION }).in("id", mensajes.map((m) => m.id));
    return { ...resultado, pendientes: mensajes.length, conectado: false };
  }

  const conA = new Set<string>();
  for (const m of mensajes) {
    // C y E solo cuando el proyecto ya existe en Operflow (A enviado).
    if (m.mensaje !== "A" && !conA.has(m.lead_id)) {
      const { data: a } = await db
        .from("mensajes_operflow")
        .select("id")
        .eq("lead_id", m.lead_id)
        .eq("mensaje", "A")
        .eq("estado", "enviado")
        .maybeSingle();
      if (!a) {
        resultado.pendientes++;
        continue;
      }
      conA.add(m.lead_id);
    }
    // Se "toma" el mensaje para que otro proceso no lo envíe a la vez.
    const { data: tomado } = await db
      .from("mensajes_operflow")
      .update({ proximo_intento_at: new Date(Date.now() + 2 * 60_000).toISOString() })
      .eq("id", m.id)
      .eq("estado", "pendiente")
      .eq("intentos", m.intentos)
      .select("id");
    if (!tomado?.length) continue;

    const armado = await armar(m);
    if (!armado) {
      await db.from("mensajes_operflow").update({ estado: "fallido", ultimo_error: "No se encontraron los datos para enviar." }).eq("id", m.id);
      resultado.fallidos++;
      continue;
    }
    const { status, json } = await llamar(armado.ruta, armado.cuerpo);
    const d = decidir(status, m.intentos);
    await db
      .from("mensajes_operflow")
      .update({
        estado: d.estado,
        intentos: m.intentos + 1,
        ultimo_error: d.error,
        respuesta_http: status || null,
        enviado_at: d.estado === "enviado" ? new Date().toISOString() : null,
        proximo_intento_at: new Date(Date.now() + d.esperaMin * 60_000).toISOString(),
      })
      .eq("id", m.id);
    await registrarEvento({ direccion: "salida", mensaje: m.mensaje, estado_http: status, detalle: `lead ${m.lead_id.slice(0, 8)}` });

    if (d.estado === "enviado") {
      resultado.enviados++;
      if (m.mensaje === "A") {
        conA.add(m.lead_id);
        const proyecto = typeof json.proyecto_id === "string" ? json.proyecto_id.slice(0, 120) : null;
        if (proyecto) await db.from("leads").update({ operflow_proyecto_id: proyecto }).eq("id", m.lead_id);
      }
      await db.from("actividades").insert({
        lead_id: m.lead_id,
        autor_id: null,
        tipo: "operflow",
        detalle:
          m.mensaje === "A" ? "Proyecto enviado a Operflow" : m.mensaje === "C" ? "Pago informado a Operflow" : "Operflow recibió la orden de borrar el proyecto",
      });
    } else if (d.estado === "fallido") {
      resultado.fallidos++;
    } else {
      resultado.pendientes++;
    }
  }
  return resultado;
}
