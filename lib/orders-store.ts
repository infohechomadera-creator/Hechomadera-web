/**
 * Órdenes ANTIGUAS de la tienda en Upstash Redis (antes de W5). Solo lectura.
 * Desde W5 las órdenes viven en Supabase (`lib/pagos/ordenes.ts`); esto solo existe para el
 * botón único de gerencia que copia las viejas a Supabase. Redis queda como respaldo y ya no se escribe.
 */
import { Redis } from "@upstash/redis";

export type OrdenRedis = {
  order_id: string;
  source_reference: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  preference_id: string | null;
  redirect_url: string | null;
  items: { title: string; quantity: number; unit_price: number; currency_id: "COP" }[];
  total_cop: number;
  payment?: {
    id: number | null;
    status: string | null;
    status_detail: string | null;
    date_created: string | null;
    date_approved: string | null;
    payment_method_id: string | null;
  };
};

const PREFIJO = "hm:orders:";
const INDICE = "hm:orders:index";

export async function leerOrdenesRedis(limite = 2000): Promise<OrdenRedis[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  const ids = Array.from(new Set(((await redis.lrange<string>(INDICE, 0, limite - 1)) ?? []).filter(Boolean)));
  const filas: OrdenRedis[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const lote = await Promise.all(ids.slice(i, i + 50).map((id) => redis.get<OrdenRedis>(`${PREFIJO}${id}`)));
    for (const f of lote) if (f && typeof f === "object") filas.push(f);
  }
  return filas;
}

/** Convierte una orden de Redis en filas de Supabase (orden y, si tiene, su pago). null si no sirve. */
const ESTADO_ORDEN: Record<string, string> = { created: "creada", pending: "pendiente", approved: "aprobada", rejected: "rechazada" };
const ESTADO_PAGO = (s: string | null | undefined) =>
  s === "approved" ? "aprobado" : s === "refunded" || s === "charged_back" ? "devuelto" : s === "rejected" || s === "cancelled" ? "rechazado" : "pendiente";

export function aFilas(o: OrdenRedis) {
  const items = Array.isArray(o.items) ? o.items.filter((i) => i && Number.isFinite(i.unit_price) && Number.isFinite(i.quantity)) : [];
  const total = Math.round(Number(o.total_cop) || items.reduce((a, i) => a + i.unit_price * i.quantity, 0));
  if (!/^ord_[a-z0-9_]{4,80}$/.test(o.order_id ?? "") || !(total > 0)) return null;
  const orden = {
    id: o.order_id,
    tipo: "tienda",
    lead_id: null,
    origen: "redis",
    referencia: o.source_reference?.slice(0, 120) ?? null,
    items,
    total_cop: total,
    estado: ESTADO_ORDEN[o.status] ?? "pendiente",
    preferencia_id: o.preference_id?.slice(0, 120) ?? null,
    url_pago: o.redirect_url?.startsWith("https://") ? o.redirect_url : null,
    creado_at: o.created_at,
    actualizado_at: o.updated_at ?? o.created_at,
  };
  const p = o.payment;
  const pago =
    p?.id && Number.isSafeInteger(p.id)
      ? {
          orden_id: o.order_id,
          lead_id: null,
          tipo: "tienda",
          mp_pago_id: p.id,
          estado: ESTADO_PAGO(p.status),
          estado_mp: p.status?.slice(0, 40) ?? null,
          detalle: p.status_detail?.slice(0, 200) ?? null,
          metodo: p.payment_method_id?.slice(0, 60) ?? null,
          monto: total,
          cuenta: p.status === "approved",
          pagado_at: p.date_approved ?? null,
          creado_at: p.date_created ?? o.created_at,
        }
      : null;
  return { orden, pago };
}
