"use server";

/**
 * Copia única de las órdenes antiguas de Redis a Supabase (W5). Solo gerencia.
 * No duplica: si una orden o un pago ya están en Supabase, se dejan como están.
 */
import { revalidatePath } from "next/cache";
import { rolActual } from "@/lib/sesion";
import { clienteSistema } from "@/lib/supabase/servidor";
import { aFilas, leerOrdenesRedis, type OrdenRedis } from "@/lib/orders-store";

export type ResultadoCopia = { ok: true; leidas: number; copiadas: number; omitidas: number } | { ok: false; error: string };


export async function copiarOrdenesRedis(): Promise<ResultadoCopia> {
  if ((await rolActual()) !== "gerencia") return { ok: false, error: "Solo gerencia." };
  let viejas: OrdenRedis[] | null;
  try {
    viejas = await leerOrdenesRedis();
  } catch {
    return { ok: false, error: "No se pudo leer Redis. Intenta de nuevo." };
  }
  if (!viejas) return { ok: false, error: "Redis no está configurado en este entorno." };
  const filas = viejas.map(aFilas);
  const validas = filas.filter((f): f is NonNullable<typeof f> => f !== null);
  const db = clienteSistema();
  let copiadas = 0;
  for (let i = 0; i < validas.length; i += 100) {
    const lote = validas.slice(i, i + 100);
    const { data, error } = await db
      .from("ordenes")
      .upsert(lote.map((f) => f.orden), { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) return { ok: false, error: "No se pudieron guardar las órdenes en Supabase." };
    copiadas += data?.length ?? 0;
    const pagos = lote.flatMap((f) => (f.pago ? [f.pago] : []));
    if (pagos.length) {
      const r = await db.from("pagos").upsert(pagos, { onConflict: "mp_pago_id", ignoreDuplicates: true });
      if (r.error) return { ok: false, error: "No se pudieron guardar los pagos en Supabase." };
    }
  }
  revalidatePath("/admin");
  return { ok: true, leidas: viejas.length, copiadas, omitidas: filas.length - validas.length };
}
