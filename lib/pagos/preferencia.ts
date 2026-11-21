/**
 * Preferencia de Checkout Pro de Mercado Pago (redirección al pago). Solo servidor.
 * El monto siempre viene de una orden ya guardada, calculada en el servidor.
 */
import type { ItemOrden } from "./ordenes";

/**
 * Dirección pública de este despliegue. En una vista previa de Vercel se usa la de la rama,
 * para que Mercado Pago avise (webhook) y devuelva al cliente a la misma vista previa.
 */
export function urlDelSitio(): string {
  const rama = process.env.VERCEL_BRANCH_URL;
  if (process.env.VERCEL_ENV === "preview" && rama) return `https://${rama}`;
  // En producción, el dominio de producción que da Vercel: así el aviso de pago siempre llega aquí.
  const produccion = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && produccion) return `https://${produccion}`;
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Un cobro vence a las 24 horas: después no se puede pagar con un valor viejo (ver ordenes.ts). */
export const VIGENCIA_COBRO_HORAS = 24;

/** Fecha en el formato de Mercado Pago, hora de Colombia: 2026-11-19T10:00:00.000-05:00. */
export function fechaMP(d: Date): string {
  return `${new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 23)}-05:00`;
}

export type ResultadoPreferencia =
  | { ok: true; preferenciaId: string | null; url: string }
  | { ok: false; status: number; error: string };

export async function crearPreferencia(args: {
  ordenId: string;
  items: ItemOrden[];
  /** A dónde vuelve el cliente (sin dominio). Por defecto, /pago/resultado. */
  rutaRegreso?: string;
}): Promise<ResultadoPreferencia> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { ok: false, status: 503, error: "Los pagos no están configurados todavía." };

  const base = urlDelSitio();
  const regreso = `${base}${args.rutaRegreso ?? "/pago/resultado"}`;
  const con = (estado: string) => `${regreso}?estado=${estado}&order_id=${encodeURIComponent(args.ordenId)}`;
  const preferencia = {
    items: args.items.map((i) => ({ ...i, title: i.title.slice(0, 256) })),
    back_urls: { success: con("aprobado"), failure: con("rechazado"), pending: con("pendiente") },
    auto_return: "approved",
    statement_descriptor: "HECHOMADERA",
    external_reference: args.ordenId,
    expires: true,
    // Pagos en efectivo (Efecty y similares): el ticket también vence a las 24 h.
    date_of_expiration: fechaMP(new Date(Date.now() + VIGENCIA_COBRO_HORAS * 3600_000)),
    expiration_date_from: fechaMP(new Date(Date.now() - 60_000)),
    expiration_date_to: fechaMP(new Date(Date.now() + VIGENCIA_COBRO_HORAS * 3600_000)),
    // Solo en https: Mercado Pago no avisa a localhost.
    ...(base.startsWith("https://") ? { notification_url: `${base}/api/payments/mercadopago/webhook` } : {}),
  };

  let res: Response;
  try {
    res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(preferencia),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, status: 502, error: "No pudimos conectar con Mercado Pago. Intenta de nuevo." };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string; init_point?: string; sandbox_init_point?: string };
  if (!res.ok) {
    console.error("[preferencia] Mercado Pago rechazó la preferencia", res.status);
    return { ok: false, status: 502, error: "Mercado Pago rechazó el cobro. Intenta de nuevo." };
  }
  // Producción: el pago normal. Vista previa y local: el pago de prueba. (Las credenciales de prueba nuevas
  // empiezan por APP_USR- igual que las reales, así que se decide por el entorno; las viejas TEST- también.)
  const prueba = process.env.VERCEL_ENV !== "production" || token.startsWith("TEST-");
  const url = prueba ? (data.sandbox_init_point ?? data.init_point) : (data.init_point ?? data.sandbox_init_point);
  if (!url || !url.startsWith("https://")) return { ok: false, status: 502, error: "Mercado Pago no devolvió el enlace de pago." };
  return { ok: true, preferenciaId: data.id ?? null, url };
}

/**
 * Vence en Mercado Pago los cobros abiertos (últimas 25 h) de todos los leads del cliente de este lead.
 * Se usa al marcar "No aprobó" o "Borrar cliente": así el cliente ya no puede pagar un enlace viejo.
 * Si Mercado Pago falla, no frena el borrado: la base igual deja cualquier pago que llegue "para revisar".
 */
export async function vencerCobrosAbiertos(leadId: string): Promise<void> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return;
  const { clienteSistema } = await import("@/lib/supabase/servidor");
  const db = clienteSistema();
  const { data: lead } = await db.from("leads").select("cliente_id").eq("id", leadId).maybeSingle<{ cliente_id: string }>();
  if (!lead) return;
  const { data: leads } = await db.from("leads").select("id").eq("cliente_id", lead.cliente_id).returns<{ id: string }[]>();
  const desde = new Date(Date.now() - 25 * 3600_000).toISOString();
  const { data: ordenes } = await db
    .from("ordenes")
    .select("id, preferencia_id")
    .in("lead_id", (leads ?? []).map((l) => l.id))
    .in("estado", ["creada", "pendiente", "rechazada"])
    .not("preferencia_id", "is", null)
    .gte("creado_at", desde)
    .returns<{ id: string; preferencia_id: string }[]>();
  for (const o of ordenes ?? []) {
    try {
      const res = await fetch(`https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(o.preferencia_id)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expires: true, expiration_date_to: fechaMP(new Date(Date.now() - 60_000)) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) console.error("[preferencia] no se pudo vencer el cobro", o.id, res.status);
    } catch {
      console.error("[preferencia] no se pudo vencer el cobro", o.id);
    }
  }
}
