/**
 * Integración Web ↔ Operflow (docs/CONTRATO-INTEGRACION.md). Solo servidor a servidor.
 *  - Clave compartida `OPERFLOW_API_KEY` en `Authorization: Bearer ...`.
 *  - Límite de solicitudes por minuto por IP y por clave (lib/limite.ts).
 *  - Registro de cada llamada en `eventos_integracion`, sin datos sensibles.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/servidor";
import type { TablaPrecios } from "@/lib/precios/tipos";

export const LIMITE_POR_MINUTO = 60;
/** Intentos por minuto desde una misma IP, antes de revisar la clave (frena a quien intente adivinarla). */
export const LIMITE_IP_POR_MINUTO = 30;

/** Compara la clave recibida con la esperada en tiempo constante. */
export function claveValida(encabezado: string | null, esperada: string | undefined): boolean {
  if (!esperada || !encabezado || !/^bearer /i.test(encabezado)) return false;
  const recibida = encabezado.slice("Bearer ".length).trim();
  const a = createHash("sha256").update(recibida).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}

export async function registrarEvento(evento: {
  direccion: "entrada" | "salida";
  mensaje: "A" | "B" | "C" | "D" | "E";
  estado_http: number;
  detalle?: string;
}): Promise<void> {
  try {
    await clienteSistema()
      .from("eventos_integracion")
      .insert({ ...evento, detalle: evento.detalle?.slice(0, 500) ?? null });
  } catch {
    // El registro nunca debe tumbar la respuesta.
  }
}

/** Respuesta del mensaje D: precios vigentes de una ciudad, sin datos internos. */
export function respuestaPrecios(tabla: TablaPrecios, versionId: string | null) {
  return {
    ciudad: tabla.ciudad,
    moneda: tabla.moneda,
    vigente_desde: tabla.vigente_desde,
    version_id: versionId,
    metro_lineal: tabla.metro_lineal,
    isla_metro_lineal: tabla.isla_metro_lineal,
    colores: tabla.colores,
    herrajes: tabla.herrajes,
    valor_diseno: tabla.valor_diseno,
    anticipo_pct: tabla.anticipo_pct,
    incertidumbre_pct: tabla.incertidumbre_pct,
  };
}
