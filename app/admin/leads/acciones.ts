"use server";

/**
 * Acciones del CRM (W4). Cada una revisa el rol, valida lo que llega y escribe como la persona
 * con sesión: la base (RLS y disparadores) decide si puede. Un asesor solo toca sus leads.
 */
import { revalidatePath } from "next/cache";
import { rolActual } from "@/lib/sesion";
import { clienteSistema, clienteUsuario } from "@/lib/supabase/servidor";
import { hoyEnColombia } from "@/lib/precios/fechas";
import { borrarFotosDelCliente } from "@/lib/borrado";
import { enviarPendientes } from "@/lib/integracion/salida";
import { leerCobroLead } from "@/lib/pagos/lead";
import { crearOrdenId } from "@/lib/pagos/ordenes";
import { vencerCobrosAbiertos } from "@/lib/pagos/preferencia";
import { avisarPagoLead } from "@/lib/email-notifications";
import { ESTADOS_A_MANO, UUID, esEstadoAMano, validarNota, validarProximoContacto } from "@/lib/leads";

export type Resultado = { ok: true } | { ok: false; error: string };

const NO_ENCONTRADO: Resultado = { ok: false, error: "No encontramos ese lead o no es tuyo." };
const NO_ENCONTRADO_O_SISTEMA: Resultado = {
  ok: false,
  error: "No encontramos ese lead, no es tuyo o su estado ya lo maneja el sistema.",
};
const FALLA: Resultado = { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
const SESION_VENCIDA: Resultado = { ok: false, error: "Tu sesión venció. Vuelve a entrar." };

async function conSesion() {
  const rol = await rolActual();
  if (!rol) return null;
  const supabase = await clienteUsuario();
  const { data } = await supabase.auth.getUser();
  return data.user ? { rol, supabase, uid: data.user.id } : null;
}

function refrescar(leadId: string) {
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

/** Traduce el error de la base a un mensaje simple. */
function errorBase(error: { code?: string }): Resultado {
  if (error.code === "42501") return { ok: false, error: "Ese cambio solo lo hace gerencia o el sistema." };
  if (error.code === "23514") return { ok: false, error: "Esa persona no está activa en el equipo." };
  return FALLA;
}

async function actualizar(
  leadId: string,
  cambios: Record<string, unknown>,
  { soloGerencia = false, desdeEstadoAMano = false } = {},
): Promise<Resultado> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  const s = await conSesion();
  if (!s) return { ok: false, error: "Tu sesión venció. Vuelve a entrar." };
  if (soloGerencia && s.rol !== "gerencia") return { ok: false, error: "Solo gerencia puede asignar leads." };
  let consulta = s.supabase.from("leads").update(cambios).eq("id", leadId);
  // Un lead que ya pagó o va en Operflow no vuelve a un estado a mano (ni siquiera gerencia).
  if (desdeEstadoAMano) consulta = consulta.in("estado", [...ESTADOS_A_MANO]);
  const { data, error } = await consulta.select("id");
  if (error) return errorBase(error);
  if (!data?.length) return desdeEstadoAMano ? NO_ENCONTRADO_O_SISTEMA : NO_ENCONTRADO;
  refrescar(leadId);
  return { ok: true };
}

/** Nuevo, contactado o perdido. Los demás estados los pone el sistema (pagos y Operflow, W5). */
export async function cambiarEstado(leadId: string, estado: string): Promise<Resultado> {
  if (!esEstadoAMano(estado)) return { ok: false, error: "Ese estado lo pone el sistema." };
  return actualizar(leadId, { estado }, { desdeEstadoAMano: true });
}

export async function ponerProximoContacto(leadId: string, fecha: string | null): Promise<Resultado> {
  const v = validarProximoContacto(fecha, hoyEnColombia());
  if (!v.ok) return v;
  return actualizar(leadId, { proximo_contacto: v.fecha });
}

/** Solo gerencia. `asesorId` null deja el lead sin asesor. */
export async function asignarAsesor(leadId: string, asesorId: string | null): Promise<Resultado> {
  if (asesorId !== null && (typeof asesorId !== "string" || !UUID.test(asesorId))) {
    return { ok: false, error: "Esa persona no está activa en el equipo." };
  }
  return actualizar(leadId, { asesor_id: asesorId }, { soloGerencia: true });
}

// ── Pagos, Operflow y borrado (W5) ─────────────────────────────────────────
// Lo que toca dinero o borra datos pasa por funciones de la base que solo ejecuta el servidor
// (llave secreta). Antes se revisa el rol y que la persona vea el lead (RLS); la base vuelve
// a revisar que quien actúa sea gerencia o el asesor del lead.

const MOTIVO_BASE: Record<string, string> = {
  no_autorizado: "Ese cambio solo lo hace gerencia o el asesor del lead.",
  estado: "Ese cambio no aplica al estado actual del lead.",
  datos: "Revisa los datos e intenta de nuevo.",
  no_existe: "No encontramos ese lead.",
  no_conservable: "Ese pago no se puede conservar: no es el pago que el lead espera, es de prueba o el lead está cerrado. Devuélvelo.",
  excede: "Ese pago es mayor que lo que falta. Devuelve la diferencia en Mercado Pago; cuando Mercado Pago lo avise, podrás conservar el resto.",
  saldo_cero: "Con ese valor medido no queda saldo: el cliente ya pagó eso o más. Si hay que devolver, hazlo en Mercado Pago.",
  anticipo_cero: "Con ese valor final el anticipo (35% menos el diseño) no da nada que cobrar. Revisa el valor.",
};

async function leadVisible(s: NonNullable<Awaited<ReturnType<typeof conSesion>>>, leadId: string): Promise<boolean> {
  const { data } = await s.supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
  return Boolean(data);
}

async function llamarBase(fn: string, args: Record<string, unknown>): Promise<Resultado & { datos?: Record<string, unknown> }> {
  const { data, error } = await clienteSistema().rpc(fn, args);
  if (error) return FALLA;
  const r = data as { ok: boolean; motivo?: string } & Record<string, unknown>;
  return r.ok ? { ok: true, datos: r } : { ok: false, error: MOTIVO_BASE[r.motivo ?? ""] ?? "No se pudo guardar. Intenta de nuevo." };
}

/** Solo gerencia: registra a mano el siguiente pago (p. ej. transferencia). El valor lo calcula el servidor. */
export async function marcarPagoManual(leadId: string, nota: string, montoVisto: number): Promise<Resultado> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  const limpia = typeof nota === "string" ? nota.trim() : "";
  if (limpia.length < 3 || limpia.length > 300) return { ok: false, error: "Escribe cómo pagó (3 a 300 caracteres), por ejemplo: transferencia Bancolombia 19/11." };
  const s = await conSesion();
  if (!s) return SESION_VENCIDA;
  if (s.rol !== "gerencia") return { ok: false, error: "Solo gerencia registra pagos a mano." };
  if (!(await leadVisible(s, leadId))) return NO_ENCONTRADO;
  const info = await leerCobroLead(leadId, { porId: true });
  if (!info?.cobro.ok) return { ok: false, error: "Este lead no tiene un pago pendiente." };
  // Lo que gerencia vio en pantalla debe ser exactamente lo que se registra.
  if (info.cobro.monto !== montoVisto) return { ok: false, error: "El valor a pagar cambió. Recarga la página y revisa antes de registrar." };
  const r = await llamarBase("registrar_pago_manual", {
    p_lead: leadId,
    p_tipo: info.cobro.tipo,
    p_monto: info.cobro.monto,
    p_autor: s.uid,
    p_nota: limpia,
    p_orden_id: crearOrdenId(),
  });
  if (!r.ok) return r;
  if (!r.datos?.nuevo_aprobado) {
    refrescar(leadId);
    return { ok: false, error: "El pago quedó registrado pero NO cuenta (repetido o el valor cambió). Revísalo en el historial." };
  }
  await enviarPendientes({ leadId });
  await avisarPagoLead({ leadId, tipo: info.cobro.tipo, monto: info.cobro.monto }).catch(() => undefined);
  refrescar(leadId);
  return { ok: true };
}

/** Solo gerencia: valor final de la propuesta (o, ya pagado el anticipo, el valor con medidas confirmadas). */
export async function ponerValorFinal(leadId: string, valor: number, medido: boolean): Promise<Resultado> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  if (!Number.isSafeInteger(valor) || valor < 100_000 || valor > 10_000_000_000) {
    return { ok: false, error: "Escribe un valor en pesos, sin puntos ni comas (mínimo 100.000)." };
  }
  const s = await conSesion();
  if (!s) return SESION_VENCIDA;
  if (s.rol !== "gerencia") return { ok: false, error: "Solo gerencia pone el valor final." };
  if (!(await leadVisible(s, leadId))) return NO_ENCONTRADO;
  const r = await llamarBase("poner_valor_final", { p_lead: leadId, p_valor: valor, p_medido: medido === true, p_autor: s.uid });
  if (r.ok) refrescar(leadId);
  return r.ok ? { ok: true } : r;
}

/**
 * Asesor del lead o gerencia: el cliente no aprobó el diseño. Ya se le entregó el render.
 * Se borran sus fotos (cubeta), sus datos personales y notas; se conservan los pagos; Operflow borra lo suyo (E).
 */
export async function noAprobo(leadId: string, renderEntregado: boolean): Promise<Resultado> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  if (renderEntregado !== true) return { ok: false, error: "Primero entrega el render al cliente y marca la casilla." };
  const s = await conSesion();
  if (!s) return SESION_VENCIDA;
  if (!(await leadVisible(s, leadId))) return NO_ENCONTRADO;
  const { data: lead } = await s.supabase.from("leads").select("pago_estado, estado").eq("id", leadId).maybeSingle();
  if (lead?.pago_estado !== "diseno" || !["diseno_pagado", "propuesta_enviada"].includes(lead.estado)) {
    return { ok: false, error: "'No aprobó' aplica solo cuando el cliente pagó el diseño y no ha pagado el anticipo." };
  }
  await vencerCobrosAbiertos(leadId);
  if (!(await borrarFotosDelCliente(leadId))) return { ok: false, error: "No se pudieron borrar las fotos. Intenta de nuevo." };
  const r = await llamarBase("borrar_datos_cliente", { p_lead: leadId, p_autor: s.uid, p_motivo: "no_aprobo" });
  if (!r.ok) return r;
  await enviarPendientes({ leadId });
  refrescar(leadId);
  return { ok: true };
}

/**
 * Solo gerencia: borra los datos del cliente. Si nunca pagó, se borra todo (también fotos);
 * si pagó, se borran los datos personales y se conservan los pagos (lo que pide la ley).
 */
export async function borrarCliente(leadId: string, confirmacion: string): Promise<Resultado & { borrado?: boolean }> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  if (confirmacion !== "BORRAR") return { ok: false, error: "Escribe BORRAR para confirmar." };
  const s = await conSesion();
  if (!s) return SESION_VENCIDA;
  if (s.rol !== "gerencia") return { ok: false, error: "Solo gerencia borra clientes." };
  if (!(await leadVisible(s, leadId))) return NO_ENCONTRADO;
  await vencerCobrosAbiertos(leadId);
  if (!(await borrarFotosDelCliente(leadId))) return { ok: false, error: "No se pudieron borrar las fotos. Intenta de nuevo." };
  const r = await llamarBase("borrar_datos_cliente", { p_lead: leadId, p_autor: s.uid, p_motivo: "borrar" });
  if (!r.ok) return r;
  const borrado = r.datos?.resultado === "borrado";
  if (!borrado) await enviarPendientes({ leadId });
  revalidatePath("/admin/leads");
  if (!borrado) revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, borrado };
}

/**
 * Solo gerencia: resuelve un pago para revisar o devuelto. `resultado`:
 *  - "devuelto": se le devolvió TODO al cliente en Mercado Pago; no cuenta.
 *  - "conservar": la plata se queda y cuenta como abono de su tipo (la base no deja pasar de lo que falta).
 */
export async function resolverPago(leadId: string, pagoId: number, nota: string, resultado: "devuelto" | "conservar"): Promise<Resultado> {
  if (typeof leadId !== "string" || !UUID.test(leadId) || !Number.isSafeInteger(pagoId)) return NO_ENCONTRADO;
  if (resultado !== "devuelto" && resultado !== "conservar") return { ok: false, error: "Elige si se devolvió o se conserva." };
  const limpia = typeof nota === "string" ? nota.trim() : "";
  if (limpia.length < 3 || limpia.length > 300) return { ok: false, error: "Escribe cómo se resolvió (3 a 300 caracteres)." };
  const s = await conSesion();
  if (!s) return SESION_VENCIDA;
  if (s.rol !== "gerencia") return { ok: false, error: "Solo gerencia resuelve pagos." };
  if (!(await leadVisible(s, leadId))) return NO_ENCONTRADO;
  const { data: pago } = await s.supabase.from("pagos").select("id").eq("id", pagoId).eq("lead_id", leadId).maybeSingle();
  if (!pago) return NO_ENCONTRADO;
  const r = await llamarBase("resolver_pago", { p_pago_id: pagoId, p_autor: s.uid, p_nota: limpia, p_resultado: resultado });
  if (r.ok && resultado === "conservar" && r.datos?.completo) await enviarPendientes({ leadId });
  if (r.ok) refrescar(leadId);
  return r.ok ? { ok: true } : r;
}

/** Solo gerencia: reintenta ya los mensajes pendientes para Operflow de este lead. */
export async function reenviarOperflow(leadId: string): Promise<Resultado & { conectado?: boolean }> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  const s = await conSesion();
  if (!s) return SESION_VENCIDA;
  if (s.rol !== "gerencia") return { ok: false, error: "Solo gerencia reenvía a Operflow." };
  if (!(await leadVisible(s, leadId))) return NO_ENCONTRADO;
  const r = await enviarPendientes({ leadId, forzar: true });
  refrescar(leadId);
  if (!r.conectado) return { ok: false, error: "Operflow aún no está conectado. Los mensajes quedan pendientes y salen solos cuando se conecte." };
  return r.pendientes || r.fallidos ? { ok: false, error: "Operflow no recibió todo. Mira el detalle abajo." } : { ok: true };
}

export async function agregarNota(leadId: string, texto: string): Promise<Resultado> {
  if (typeof leadId !== "string" || !UUID.test(leadId)) return NO_ENCONTRADO;
  const nota = validarNota(texto);
  if (!nota) return { ok: false, error: "Escribe una nota de 1 a 2.000 caracteres." };
  const s = await conSesion();
  if (!s) return { ok: false, error: "Tu sesión venció. Vuelve a entrar." };
  const { error } = await s.supabase
    .from("actividades")
    .insert({ lead_id: leadId, autor_id: s.uid, tipo: "nota", detalle: nota });
  // RLS rechaza la nota en un lead ajeno (42501).
  if (error) return error.code === "42501" ? NO_ENCONTRADO : FALLA;
  refrescar(leadId);
  return { ok: true };
}
