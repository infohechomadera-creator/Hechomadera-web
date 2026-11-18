/**
 * Sesión en el servidor: rol del usuario actual (o null). Segunda barrera,
 * además del middleware, para las API internas.
 */
import { NextResponse } from "next/server";
import type { Rol } from "./acceso";
import { supabaseConfigurado } from "./supabase/config";
import { clienteUsuario } from "./supabase/servidor";

export async function rolActual(): Promise<Rol | null> {
  if (!supabaseConfigurado()) return null;
  try {
    const supabase = await clienteUsuario();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, activo")
      .eq("id", data.user.id)
      .maybeSingle();
    return perfil?.activo ? (perfil.rol as Rol) : null;
  } catch {
    return null;
  }
}

/** Devuelve una respuesta 401 si quien llama no es gerencia; null si puede seguir. */
export async function exigirGerencia(): Promise<NextResponse | null> {
  return (await rolActual()) === "gerencia"
    ? null
    : NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
}
