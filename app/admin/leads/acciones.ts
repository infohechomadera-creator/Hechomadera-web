"use server";

/**
 * Acciones del CRM (W4). Cada una revisa el rol, valida lo que llega y escribe como la persona
 * con sesión: la base (RLS y disparadores) decide si puede. Un asesor solo toca sus leads.
 */
import { revalidatePath } from "next/cache";
import { rolActual } from "@/lib/sesion";
import { clienteUsuario } from "@/lib/supabase/servidor";
import { hoyEnColombia } from "@/lib/precios/fechas";
import { ESTADOS_A_MANO, UUID, esEstadoAMano, validarNota, validarProximoContacto } from "@/lib/leads";

export type Resultado = { ok: true } | { ok: false; error: string };

const NO_ENCONTRADO: Resultado = { ok: false, error: "No encontramos ese lead o no es tuyo." };
const NO_ENCONTRADO_O_SISTEMA: Resultado = {
  ok: false,
  error: "No encontramos ese lead, no es tuyo o su estado ya lo maneja el sistema.",
};
const FALLA: Resultado = { ok: false, error: "No se pudo guardar. Intenta de nuevo." };

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
