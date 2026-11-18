"use server";

import { revalidatePath } from "next/cache";
import { rolActual } from "@/lib/sesion";
import { clienteUsuario } from "@/lib/supabase/servidor";
import { CIUDADES_ACTIVAS, type CiudadActiva, type TablaPrecios } from "@/lib/precios/tipos";
import { validarTablaPrecios } from "@/lib/precios/validar";
import { hoyEnColombia } from "@/lib/precios/fechas";

export type ResultadoPublicar = { ok: true; vigente_desde: string } | { ok: false; problemas: string[] };

/**
 * Publica una versión nueva de la tabla de precios de una ciudad (solo gerencia).
 * No edita versiones anteriores: crea una nueva, a nombre de quien la publica.
 */
export async function publicarPrecios(ciudad: string, vigenteDesde: string, datos: TablaPrecios): Promise<ResultadoPublicar> {
  if ((await rolActual()) !== "gerencia") return { ok: false, problemas: ["Solo gerencia puede cambiar precios."] };
  if (!CIUDADES_ACTIVAS.includes(ciudad as CiudadActiva)) return { ok: false, problemas: ["Ciudad no válida."] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenteDesde) || vigenteDesde < hoyEnColombia()) {
    return { ok: false, problemas: ["La fecha de vigencia debe ser hoy o una fecha futura."] };
  }

  const tabla: TablaPrecios = { ...datos, ciudad, vigente_desde: vigenteDesde, moneda: "COP" };
  const problemas = validarTablaPrecios(tabla);
  if (problemas.length) return { ok: false, problemas };

  const supabase = await clienteUsuario();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, problemas: ["Tu sesión venció. Vuelve a entrar."] };

  // RLS exige que quien publica sea gerencia y que la versión quede a su nombre.
  const { error } = await supabase
    .from("precios")
    .insert({ ciudad, vigente_desde: vigenteDesde, datos: tabla, creado_por: data.user.id });
  if (error) return { ok: false, problemas: ["No se pudo guardar. Intenta de nuevo."] };

  revalidatePath("/cocinas");
  revalidatePath("/admin/precios");
  return { ok: true, vigente_desde: vigenteDesde };
}
