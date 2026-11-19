/**
 * Procesa un pago informado por Mercado Pago (W5). No se confía en el cuerpo del aviso:
 * se consulta el pago en la API de Mercado Pago con nuestra credencial y la base decide
 * (`registrar_pago`): compara monto y moneda con la orden, evita repetidos y marca el lead.
 */
import { fetchMercadoPagoPayment, type MercadoPagoPayment } from "@/lib/mercadopago";
import { clienteSistema } from "@/lib/supabase/servidor";

export type ResultadoRegistro = {
  ok: boolean;
  motivo?: string;
  nuevo_aprobado?: boolean;
  repetido?: boolean;
  tipo?: "tienda" | "diseno" | "anticipo" | "saldo";
  lead_id?: string;
};

export type Procesado =
  | { ok: true; pago: MercadoPagoPayment; registro: ResultadoRegistro }
  | { ok: false; reintentar: boolean; error: string; pago?: MercadoPagoPayment };

export async function procesarPagoMP(paymentId: string): Promise<Procesado> {
  const consulta = await fetchMercadoPagoPayment(paymentId);
  if (!consulta.ok) {
    // 404: el pago no existe (aviso falso o de otra cuenta). Lo demás puede ser pasajero.
    return { ok: false, reintentar: consulta.status !== 404 && consulta.status !== 400, error: `${consulta.status}: ${consulta.error}` };
  }
  const p = consulta.payment;
  const orden = p.external_reference ?? "";
  if (!/^ord_[a-z0-9_]{4,80}$/.test(orden)) {
    return { ok: false, reintentar: false, error: "pago_sin_orden_conocida", pago: p };
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
  });
  if (error) return { ok: false, reintentar: true, error: `base: ${error.code ?? "error"}`, pago: p };
  return { ok: true, pago: p, registro: data as ResultadoRegistro };
}
