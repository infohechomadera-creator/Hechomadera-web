/**
 * Cobros por lead (W5): qué toca pagar ahora y cuánto. Funciones puras, sin red ni base.
 *  - Diseño: precio fijo por producto (tabla de precios vigente de la ciudad).
 *  - Anticipo: `anticipo_pct`% del valor final de la propuesta − lo pagado por el diseño.
 *  - Saldo: valor final con medidas confirmadas − (diseño + anticipo pagados). Sin tolerancia.
 * Todos los valores son pesos colombianos enteros. El navegador nunca manda montos.
 */
import type { Producto, TablaPrecios } from "@/lib/precios/tipos";

export type TipoCobro = "diseno" | "anticipo" | "saldo";

export const ETIQUETA_COBRO: Record<TipoCobro, string> = {
  diseno: "Diseño",
  anticipo: "Anticipo",
  saldo: "Saldo",
};

export interface LeadParaCobro {
  producto: Producto;
  pago_estado: "nada" | "diseno" | "anticipo" | "saldo";
  estado: string;
  valor_final: number | null;
  valor_final_medido: number | null;
  operflow_estado: string | null;
  datos_borrados: boolean;
  /** Hay un pago devuelto o en revisión sin resolver: no se cobra nada más hasta que gerencia lo vea. */
  pago_en_revision?: boolean;
  /** Los precios no salieron de la tabla de Supabase (se usó la semilla de ejemplo): no se cobra. */
  sin_precios?: boolean;
}

/** Lo que el lead ya pagó y cuenta (aprobado, no repetido), por tipo. */
export type Pagado = Record<TipoCobro, number>;

export type MotivoSinCobro =
  | "pagado_todo"
  | "espera_propuesta"
  | "espera_medidas"
  | "cerrado"
  | "sin_monto"
  | "en_revision"
  | "sin_precios";

export type SiguienteCobro = { ok: true; tipo: TipoCobro; monto: number } | { ok: false; motivo: MotivoSinCobro };

export const MOTIVO_SIN_COBRO: Record<MotivoSinCobro, string> = {
  pagado_todo: "Este proyecto ya está pagado por completo.",
  espera_propuesta: "El diseño ya está pagado. El siguiente pago se habilita cuando recibas la propuesta.",
  espera_medidas: "El anticipo ya está pagado. El saldo se habilita cuando confirmemos las medidas.",
  cerrado: "Este enlace de pago ya no está activo.",
  sin_monto: "No hay un valor pendiente por pagar. Escríbenos si tienes dudas.",
  en_revision: "Estamos revisando un pago de este proyecto. Escríbenos por WhatsApp antes de pagar.",
  sin_precios: "No podemos calcular el pago en este momento. Escríbenos por WhatsApp.",
};

export function montoDiseno(tabla: Pick<TablaPrecios, "valor_diseno">, producto: Producto): number {
  const v = tabla.valor_diseno[producto];
  return Number.isInteger(v) && v > 0 ? v : 0;
}

export function montoAnticipo(valorFinal: number, anticipoPct: number, disenoPagado: number): number {
  return Math.round((valorFinal * anticipoPct) / 100) - disenoPagado;
}

export function montoSaldo(valorMedido: number, pagado: Pagado): number {
  return valorMedido - pagado.diseno - pagado.anticipo;
}

export function siguienteCobro(
  lead: LeadParaCobro,
  tabla: Pick<TablaPrecios, "valor_diseno" | "anticipo_pct">,
  pagado: Pagado,
): SiguienteCobro {
  if (lead.datos_borrados || lead.estado === "no_aprobo" || lead.operflow_estado === "cancelado") {
    return { ok: false, motivo: "cerrado" };
  }
  if (lead.pago_en_revision) return { ok: false, motivo: "en_revision" };
  if (lead.sin_precios) return { ok: false, motivo: "sin_precios" };
  const conMonto = (tipo: TipoCobro, monto: number): SiguienteCobro =>
    Number.isSafeInteger(monto) && monto > 0 ? { ok: true, tipo, monto } : { ok: false, motivo: "sin_monto" };

  switch (lead.pago_estado) {
    case "nada":
      return conMonto("diseno", montoDiseno(tabla, lead.producto));
    case "diseno":
      if (!lead.valor_final) return { ok: false, motivo: "espera_propuesta" };
      return conMonto("anticipo", montoAnticipo(lead.valor_final, tabla.anticipo_pct, pagado.diseno));
    case "anticipo":
      if (!lead.valor_final_medido) return { ok: false, motivo: "espera_medidas" };
      return conMonto("saldo", montoSaldo(lead.valor_final_medido, pagado));
    default:
      return { ok: false, motivo: "pagado_todo" };
  }
}

/** Suma lo pagado por tipo a partir de las filas de `pagos` que cuentan. */
export function sumarPagado(filas: { tipo: string; monto: number; cuenta: boolean }[]): Pagado {
  const p: Pagado = { diseno: 0, anticipo: 0, saldo: 0 };
  for (const f of filas) if (f.cuenta && f.tipo in p) p[f.tipo as TipoCobro] += Number(f.monto);
  return p;
}
