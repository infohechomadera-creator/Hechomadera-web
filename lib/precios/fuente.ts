/**
 * De dónde salen los precios: la tabla `precios_vigentes` de Supabase (única fuente).
 * Si Supabase no está disponible o una versión no pasa la validación, esa ciudad
 * usa la semilla de ejemplo, para que la web nunca se caiga por un precio.
 */
import { supabaseConfigurado } from "@/lib/supabase/config";
import { clienteSistema } from "@/lib/supabase/servidor";
import { PRECIOS_EJEMPLO } from "./semilla";
import { CIUDADES_ACTIVAS, type CiudadActiva, type OpcionRecargo, type TablaPrecios } from "./tipos";
import { validarTablaPrecios } from "./validar";

export type OrigenPrecio = "supabase" | "semilla";

export interface PreciosPorCiudad {
  tablas: Record<CiudadActiva, TablaPrecios>;
  origen: Record<CiudadActiva, OrigenPrecio>;
}

/** Elige la tabla de cada ciudad a partir de las filas leídas (función pura, probada). */
export function elegirTablas(filas: { ciudad: string; datos: unknown }[]): PreciosPorCiudad {
  const tablas = {} as Record<CiudadActiva, TablaPrecios>;
  const origen = {} as Record<CiudadActiva, OrigenPrecio>;
  for (const ciudad of CIUDADES_ACTIVAS) {
    const fila = filas.find((f) => f.ciudad === ciudad);
    const valida = fila && validarTablaPrecios(fila.datos).length === 0;
    tablas[ciudad] = valida ? (fila.datos as TablaPrecios) : PRECIOS_EJEMPLO[ciudad];
    origen[ciudad] = valida ? "supabase" : "semilla";
  }
  return { tablas, origen };
}

export async function obtenerPrecios(): Promise<PreciosPorCiudad> {
  if (!supabaseConfigurado() || !process.env.SUPABASE_SECRET_KEY) return elegirTablas([]);
  try {
    const { data, error } = await clienteSistema().from("precios_vigentes").select("ciudad, datos");
    if (error || !data) return elegirTablas([]);
    return elegirTablas(data);
  } catch {
    return elegirTablas([]);
  }
}

/** La opción más económica de una lista (para el "desde"). */
export function opcionMasEconomica(opciones: Record<string, OpcionRecargo>): string {
  return Object.entries(opciones).sort((a, b) => a[1].recargo_pct - b[1].recargo_pct)[0][0];
}
