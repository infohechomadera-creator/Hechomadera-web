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
  // Con credenciales de prueba (TEST-…) se usa el pago de prueba; con las reales, el normal.
  const url = token.startsWith("TEST-") ? (data.sandbox_init_point ?? data.init_point) : (data.init_point ?? data.sandbox_init_point);
  if (!url || !url.startsWith("https://")) return { ok: false, status: 502, error: "Mercado Pago no devolvió el enlace de pago." };
  return { ok: true, preferenciaId: data.id ?? null, url };
}
