import { NextResponse } from "next/server";
import { configSupabase } from "@/lib/supabase/config";
import { clienteSistema } from "@/lib/supabase/servidor";

/**
 * Diagnóstico de conexión (solo desarrollo y vistas previas; nunca en producción).
 * Responde únicamente sí/no y conteos: nunca muestra llaves ni datos personales.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  const { lista } = configSupabase();
  const secreta = Boolean(process.env.SUPABASE_SECRET_KEY);
  let conexion = false;
  let ciudadesConPrecio: number | null = null;
  let error: string | null = null;
  if (lista && secreta) {
    try {
      const { count, error: e } = await clienteSistema()
        .from("precios_vigentes")
        .select("ciudad", { count: "exact", head: true });
      if (e) error = e.message;
      else {
        conexion = true;
        ciudadesConPrecio = count ?? 0;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "error desconocido";
    }
  }
  return NextResponse.json({ supabase_configurado: lista, llave_secreta: secreta, conexion, ciudadesConPrecio, error });
}
