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
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
