/**
 * Procesa un pago informado por Mercado Pago (W5). No se confía en el cuerpo del aviso:
 * se consulta el pago en la API de Mercado Pago con nuestra credencial y la base decide
 * (`registrar_pago`): compara monto y moneda con la orden, recalcula lo que se debía pagar,
 * evita repetidos y marca el lead.
 */
import { fetchMercadoPagoPayment, type MercadoPagoPayment } from "@/lib/mercadopago";
import { clienteSistema } from "@/lib/supabase/servidor";

export type Alerta =
  | "monto"
  | "valor_cambio"
  | "repetido"
  | "devuelto"
  | "reclamo"
  | "sin_orden"
  | "prueba_en_produccion"
  | "cerrado"
  | "prueba"
  | "en_revision"
  | "error_base"
  | "saldo_negativo"
  | "devolucion_parcial"
  | "sin_cobro";

export type ResultadoRegistro = {
  ok: boolean;
  motivo?: string;
  nuevo_aprobado?: boolean;
  repetido?: boolean;
  alerta?: Alerta;
  tipo?: "tienda" | "diseno" | "anticipo" | "saldo";
  lead_id?: string;
};

export type Procesado =
  | { ok: true; pago: MercadoPagoPayment; registro: ResultadoRegistro }
  | { ok: false; reintentar: boolean; error: string; pago?: MercadoPagoPayment; alerta?: Alerta };

/** En producción solo cuenta dinero real: un pago de prueba nunca marca un lead como pagado. */
export const esProduccion = () => process.env.VERCEL_ENV === "production";

/**
 * La vista previa (y el computador local) usan la MISMA base de datos que la web real. Para que nadie
 * pague ahí con tarjetas de prueba (o con dinero real) un lead de verdad, fuera de producción solo
 * gerencia con sesión puede iniciar cobros. Devuelve true si se puede cobrar.
 */
/**
 * Interruptor de cobros a leads por Mercado Pago (W7, decisión de Alberto 2026-11-24: nada de dinero real
 * por ahora). En producción solo se cobra a leads con `COBROS_LEADS_ACTIVOS=true`.
 * Fuera de producción solo con credencial de PRUEBA de Mercado Pago (empieza por "TEST-"), que no mueve plata:
 * así el interruptor encendido en todos los entornos no hace cobrar a la vista previa con la credencial real.
 * La tienda no usa este interruptor.
 */
export function cobrosLeadsActivos(): boolean {
  if (esProduccion()) return process.env.COBROS_LEADS_ACTIVOS === "true";
  return (process.env.MERCADOPAGO_ACCESS_TOKEN ?? "").startsWith("TEST-");
}

export const COBROS_EN_PAUSA =
  "Por ahora el pago en línea está en pausa. Te contactaremos para seguir con tu proyecto; si tienes preguntas, escríbenos por WhatsApp.";

export async function puedeCobrarAqui(rol: () => Promise<string | null>): Promise<boolean> {
  return esProduccion() || (await rol()) === "gerencia";
}

export async function procesarPagoMP(paymentId: string): Promise<Procesado> {
  const consulta = await fetchMercadoPagoPayment(paymentId);
  if (!consulta.ok) {
    // 404: el pago no existe (aviso falso o de otra cuenta). Lo demás puede ser pasajero.
    return { ok: false, reintentar: consulta.status !== 404 && consulta.status !== 400, error: `${consulta.status}: ${consulta.error}` };
  }
  const p = consulta.payment;
  const aprobado = p.status === "approved";
  if (esProduccion() && p.live_mode === false) {
    return { ok: false, reintentar: false, error: "pago_de_prueba_en_produccion", pago: p, alerta: aprobado ? "prueba_en_produccion" : undefined };
  }
  const orden = p.external_reference ?? "";
  if (!/^ord_[a-z0-9_]{4,80}$/.test(orden)) {
    // Un pago aprobado que no es de una orden nuestra: plata que entró sin registro. Se avisa.
    return { ok: false, reintentar: false, error: "pago_sin_orden_conocida", pago: p, alerta: aprobado ? "sin_orden" : undefined };
  }
  const { data, error } = await clienteSistema().rpc("registrar_pago", {
    p_orden_id: orden,
    p_mp_pago_id: p.id,
    p_estado_mp: p.status,
    p_monto: p.transaction_amount ?? null,
    p_moneda: p.currency_id ?? null,
    p_metodo: p.payment_method_id ?? null,
    p_detalle: p.status_detail ?? null,
    p_pagado_at: p.date_approved ?? null,
    p_modo_prueba: p.live_mode === false,
    // Devolución total o parcial: la base cuenta solo lo que quedó (neto) y avisa.
    p_monto_devuelto: p.transaction_amount_refunded ?? 0,
  });
  if (error) return { ok: false, reintentar: true, error: `base: ${error.code ?? "error"}`, pago: p };
  const registro = data as ResultadoRegistro;
  if (!registro.ok && registro.motivo === "orden_no_existe" && aprobado) registro.alerta = "sin_orden";
  return { ok: true, pago: p, registro };
}
