/**
 * Registro corto de los avisos (webhook) de Mercado Pago, en Supabase (`eventos_pago`).
 * Sin datos del comprador. Reemplaza la lista de Redis (W5). Los repetidos los evita la base
 * (`registrar_pago`), no este registro.
 */
import { clienteSistema } from "@/lib/supabase/servidor";

export type WebhookEventRecord = {
  provider: "mercadopago";
  event_type: string;
  action: string | null;
  processed: boolean;
  resource_id: string | null;
  payment_id: number | null;
  order_id: string | null;
  status: string | null;
  normalized_status: "approved" | "pending" | "rejected" | "unknown" | null;
  status_detail: string | null;
  error: string | null;
  received_at: string;
};

export type WebhookEventSummary = {
  total: number;
  by_event_type: Record<string, number>;
  by_processed: { true: number; false: number };
  by_normalized_status: Record<string, number>;
  with_errors: number;
};

const corto = (v: string | null | undefined, n: number) => (v == null ? null : String(v).slice(0, n));

/** Guarda el aviso. Devuelve false si no se pudo (por ejemplo, Supabase caído). */
export async function saveWebhookEvent(r: WebhookEventRecord): Promise<boolean> {
  try {
    const { error } = await clienteSistema()
      .from("eventos_pago")
      .insert({
        tipo_evento: corto(r.event_type, 60) ?? "unknown",
        accion: corto(r.action, 60),
        recurso_id: corto(r.resource_id, 60),
        mp_pago_id: r.payment_id,
        orden_id: corto(r.order_id, 90),
        estado_mp: corto(r.status, 40),
        procesado: r.processed,
        error: corto(r.error, 300),
        recibido_at: r.received_at,
      });
    if (error) console.error("[eventos_pago] no se pudo registrar", error.code);
    return !error;
  } catch {
    // El registro nunca debe tumbar el webhook.
    return false;
  }
}

const NORMALIZADO: Record<string, WebhookEventRecord["normalized_status"]> = {
  approved: "approved",
  pending: "pending",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "rejected",
  cancelled: "rejected",
  refunded: "rejected",
  charged_back: "rejected",
};

export async function listWebhookEvents(limit = 20): Promise<WebhookEventRecord[]> {
  const n = Math.max(1, Math.min(100, Number(limit) || 20));
  try {
    const { data } = await clienteSistema()
      .from("eventos_pago")
      .select("tipo_evento, accion, recurso_id, mp_pago_id, orden_id, estado_mp, procesado, error, recibido_at")
      .order("recibido_at", { ascending: false })
      .limit(n);
    return (data ?? []).map((e) => ({
      provider: "mercadopago",
      event_type: e.tipo_evento,
      action: e.accion,
      processed: e.procesado,
      resource_id: e.recurso_id,
      payment_id: e.mp_pago_id,
      order_id: e.orden_id,
      status: e.estado_mp,
      normalized_status: e.estado_mp ? (NORMALIZADO[e.estado_mp] ?? "unknown") : null,
      status_detail: null,
      error: e.error,
      received_at: e.recibido_at,
    }));
  } catch {
    return [];
  }
}

export function summarizeWebhookEvents(events: WebhookEventRecord[]): WebhookEventSummary {
  const summary: WebhookEventSummary = {
    total: events.length,
    by_event_type: {},
    by_processed: { true: 0, false: 0 },
    by_normalized_status: {},
    with_errors: 0,
  };
  for (const event of events) {
    summary.by_event_type[event.event_type] = (summary.by_event_type[event.event_type] ?? 0) + 1;
    summary.by_processed[String(event.processed) as "true" | "false"] += 1;
    const status = event.normalized_status ?? "none";
    summary.by_normalized_status[status] = (summary.by_normalized_status[status] ?? 0) + 1;
    if (event.error) summary.with_errors += 1;
  }
  return summary;
}

/** ¿Ya se registró antes este mismo problema para este pago? (para no repetir el correo de alerta). */
export async function problemaYaRegistrado(mpPagoId: number, error: string): Promise<boolean> {
  try {
    const { count } = await clienteSistema()
      .from("eventos_pago")
      .select("id", { count: "exact", head: true })
      .eq("mp_pago_id", mpPagoId)
      .eq("error", error.slice(0, 300));
    return (count ?? 0) > 1; // el registro de este aviso ya está guardado
  } catch {
    return false;
  }
}

/** Cuántas veces quedó registrado este problema para este pago. */
export async function vecesRegistrado(mpPagoId: number, error: string): Promise<number> {
  try {
    const { count } = await clienteSistema()
      .from("eventos_pago")
      .select("id", { count: "exact", head: true })
      .eq("mp_pago_id", mpPagoId)
      .eq("error", error.slice(0, 300));
    return count ?? 0;
  } catch {
    return 0;
  }
}
