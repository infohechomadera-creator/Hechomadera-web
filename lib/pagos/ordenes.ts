/**
 * Órdenes en Supabase (W5). Reemplaza `lib/orders-store.ts` (Redis).
 * Una orden es un cobro: de la tienda o de un lead (diseño, anticipo o saldo).
 * La forma `StoredOrder` se conserva para que el panel, el CSV y los correos sigan igual.
 * Escribe solo el servidor (llave secreta); el panel lee como la persona con sesión (RLS).
 */
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clienteSistema } from "@/lib/supabase/servidor";

export type OrderStatus = "created" | "pending" | "approved" | "rejected" | "unknown";
export type TipoOrden = "tienda" | "diseno" | "anticipo" | "saldo";

export type ItemOrden = { title: string; quantity: number; unit_price: number; currency_id: "COP" };

export type StoredOrder = {
  order_id: string;
  tipo: TipoOrden;
  source_reference: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  preference_id: string | null;
  redirect_url: string | null;
  items: ItemOrden[];
  total_cop: number;
  payment: {
    id: number | null;
    status: string | null;
    normalized_status: OrderStatus | null;
    status_detail: string | null;
    date_created: string | null;
    date_approved: string | null;
    payment_method_id: string | null;
  };
};

type FilaPago = {
  mp_pago_id: number | null;
  estado: string;
  estado_mp: string | null;
  detalle: string | null;
  metodo: string | null;
  pagado_at: string | null;
  creado_at: string;
};

type FilaOrden = {
  id: string;
  tipo: TipoOrden;
  referencia: string | null;
  estado: string;
  creado_at: string;
  actualizado_at: string;
  preferencia_id: string | null;
  url_pago: string | null;
  items: ItemOrden[];
  total_cop: number;
  pagos?: FilaPago[];
};

const COLUMNAS =
  "id, tipo, referencia, estado, creado_at, actualizado_at, preferencia_id, url_pago, items, total_cop, pagos(mp_pago_id, estado, estado_mp, detalle, metodo, pagado_at, creado_at)";

const ESTADO_ORDEN: Record<string, OrderStatus> = {
  creada: "created",
  pendiente: "pending",
  aprobada: "approved",
  rechazada: "rejected",
  devuelta: "rejected",
  repetida: "unknown",
  revisar: "unknown",
};

const ESTADO_PAGO: Record<string, OrderStatus> = {
  pendiente: "pending",
  aprobado: "approved",
  rechazado: "rejected",
  devuelto: "rejected",
  revisar: "unknown",
};

/** Id de orden con 64 bits al azar (las anteriores, de Redis, eran más cortas y se conservan). */
export function crearOrdenId(): string {
  return `ord_${Date.now().toString(36)}_${randomBytes(8).toString("hex")}`;
}

export function aStoredOrder(f: FilaOrden): StoredOrder {
  const ultimo = [...(f.pagos ?? [])].sort((a, b) => (a.creado_at < b.creado_at ? 1 : -1))[0];
  return {
    order_id: f.id,
    tipo: f.tipo,
    source_reference: f.referencia,
    status: ESTADO_ORDEN[f.estado] ?? "unknown",
    created_at: f.creado_at,
    updated_at: f.actualizado_at,
    preference_id: f.preferencia_id,
    redirect_url: f.url_pago,
    items: f.items ?? [],
    total_cop: Number(f.total_cop),
    payment: {
      id: ultimo?.mp_pago_id ?? null,
      status: ultimo?.estado_mp ?? ultimo?.estado ?? null,
      normalized_status: ultimo ? (ESTADO_PAGO[ultimo.estado] ?? "unknown") : null,
      status_detail: ultimo?.detalle ?? null,
      date_created: ultimo?.creado_at ?? null,
      date_approved: ultimo?.estado === "aprobado" ? ultimo.pagado_at : null,
      payment_method_id: ultimo?.metodo ?? null,
    },
  };
}

export async function guardarOrdenNueva(orden: {
  id: string;
  tipo: TipoOrden;
  lead_id: string | null;
  referencia: string | null;
  items: ItemOrden[];
}): Promise<boolean> {
  const total = orden.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const { error } = await clienteSistema().from("ordenes").insert({
    id: orden.id,
    tipo: orden.tipo,
    lead_id: orden.lead_id,
    referencia: orden.referencia,
    items: orden.items,
    total_cop: total,
  });
  if (error) console.error("[ordenes] no se pudo guardar la orden", orden.id, error.code);
  return !error;
}

export async function ponerPreferencia(id: string, preferenciaId: string | null, url: string): Promise<void> {
  const { error } = await clienteSistema()
    .from("ordenes")
    .update({ preferencia_id: preferenciaId, url_pago: url, actualizado_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[ordenes] no se pudo guardar la preferencia", id, error.code);
}

/** Borra una orden que nunca llegó a Mercado Pago (sin pagos). */
export async function borrarOrdenSinPago(id: string): Promise<void> {
  await clienteSistema().from("ordenes").delete().eq("id", id).eq("estado", "creada").is("preferencia_id", null);
}

/** Orden abierta del mismo cobro (mismo lead, tipo y valor) creada en las últimas 24 horas. */
export async function buscarOrdenAbierta(leadId: string, tipo: TipoOrden, total: number): Promise<{ id: string; url: string } | null> {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await clienteSistema()
    .from("ordenes")
    .select("id, url_pago")
    .eq("lead_id", leadId)
    .eq("tipo", tipo)
    .eq("total_cop", total)
    .in("estado", ["creada", "pendiente", "rechazada"])
    .not("url_pago", "is", null)
    .gte("creado_at", desde)
    .order("creado_at", { ascending: false })
    .limit(1);
  const fila = data?.[0];
  return fila?.url_pago ? { id: fila.id, url: fila.url_pago } : null;
}

/** Lectura del servidor (página de resultado, correos, API pública de estado). */
export async function getOrder(orderId: string): Promise<StoredOrder | null> {
  if (!/^ord_[a-z0-9_]{4,80}$/.test(orderId)) return null;
  try {
    const { data } = await clienteSistema().from("ordenes").select(COLUMNAS).eq("id", orderId).maybeSingle<FilaOrden>();
    return data ? aStoredOrder(data) : null;
  } catch {
    return null;
  }
}

/** Lista para el panel. Se pasa el cliente con sesión para que decida RLS (gerencia ve todo). */
export async function listOrders(supabase: SupabaseClient, limit = 50): Promise<StoredOrder[]> {
  const n = Math.max(1, Math.min(500, Number(limit) || 50));
  const { data, error } = await supabase.from("ordenes").select(COLUMNAS).order("creado_at", { ascending: false }).limit(n);
  if (error || !data) return [];
  return (data as FilaOrden[]).map(aStoredOrder);
}

export async function getOrderComo(supabase: SupabaseClient, orderId: string): Promise<StoredOrder | null> {
  if (!/^ord_[a-z0-9_]{4,80}$/.test(orderId)) return null;
  const { data } = await supabase.from("ordenes").select(COLUMNAS).eq("id", orderId).maybeSingle<FilaOrden>();
  return data ? aStoredOrder(data) : null;
}
