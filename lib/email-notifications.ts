/**
 * Notificaciones de email para el flujo de pago.
 * Usa Resend (RESEND_API_KEY) configurado en Vercel.
 * Se disparan desde el webhook de Mercado Pago al aprobar un pago.
 */

import type { StoredOrder } from "@/lib/pagos/ordenes";
import { clienteSistema } from "@/lib/supabase/servidor";

const RESEND_API = "https://api.resend.com/emails";
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "573012890552";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://hechomadera.com").replace(/\/$/, "");

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getWaLink(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

async function sendEmail(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email-notifications] RESEND_API_KEY no configurado — email no enviado.");
    return;
  }
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[email-notifications] Error Resend:", res.status, text);
  }
}

// ---------------------------------------------------------------------------
// Email al comprador — confirmación de pago aprobado
// ---------------------------------------------------------------------------
export async function sendPaymentConfirmationToBuyer({
  order,
  buyerEmail,
  buyerName,
}: {
  order: StoredOrder;
  buyerEmail: string;
  buyerName?: string;
}): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Hechomadera <info@hechomadera.com>";
  const greeting = buyerName ? `Hola ${buyerName},` : "Hola,";
  const waMessage = `Hola, acabo de pagar mi pedido ${order.order_id} en hechomadera.com. ¿Me pueden confirmar los próximos pasos?`;
  const waLink = getWaLink(waMessage);

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#404040;">
          ${item.title}${item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#0a0a0a;text-align:right;font-weight:500;">
          ${formatCOP(item.unit_price * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e5e5e5;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;">
            <p style="margin:0;font-size:20px;font-weight:600;color:#0a0a0a;letter-spacing:-0.5px;">Hechomadera</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#0a0a0a;">Pago recibido</p>
            <p style="margin:0 0 24px;font-size:15px;color:#404040;line-height:1.6;">
              ${greeting} recibimos la confirmación de tu pago. Estamos listos para empezar.
              Un asesor te escribe en las próximas horas para coordinar los detalles.
            </p>

            <!-- Order summary -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td colspan="2" style="padding-bottom:12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#404040;">
                  Resumen de tu pedido
                </td>
              </tr>
              ${itemsRows}
              <tr>
                <td style="padding-top:12px;font-size:14px;font-weight:600;color:#0a0a0a;">Total pagado</td>
                <td style="padding-top:12px;font-size:16px;font-weight:600;color:#0a0a0a;text-align:right;">${formatCOP(order.total_cop)}</td>
              </tr>
            </table>

            <!-- Order ID -->
            <p style="margin:0 0 24px;font-size:12px;color:#666;background:#f5f5f5;padding:10px 14px;border-left:3px solid #0a0a0a;">
              Número de orden: <strong style="color:#0a0a0a;">${order.order_id}</strong>
            </p>

            <!-- Next steps -->
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#404040;">Próximos pasos</p>
            <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#404040;line-height:1.8;">
              <li>Un asesor te contacta para confirmar detalles y medidas.</li>
              <li>Coordinamos visita técnica o ajuste de planos si aplica.</li>
              <li>Iniciamos fabricación una vez confirmado todo.</li>
            </ol>

            <!-- WhatsApp CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td style="background:#0a0a0a;padding:12px 24px;">
                  <a href="${waLink}" style="color:#fafafa;font-size:14px;font-weight:500;text-decoration:none;display:block;">
                    Escríbenos por WhatsApp
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#999;">¿Tienes alguna duda? Respondemos en menos de 15 minutos.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              El equipo de Hechomadera · <a href="${SITE_URL}" style="color:#999;">hechomadera.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail({
    from,
    to: [buyerEmail],
    subject: "Tu pedido está confirmado — Hechomadera",
    html,
    reply_to: "info@hechomadera.com",
  });
}

// ---------------------------------------------------------------------------
// Email al vendedor — alerta de nuevo pago aprobado
// ---------------------------------------------------------------------------
export async function sendNewOrderAlertToSeller({
  order,
  buyerEmail,
  buyerName,
}: {
  order: StoredOrder;
  buyerEmail?: string;
  buyerName?: string;
}): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Hechomadera <info@hechomadera.com>";
  const to = process.env.CONTACT_TO_EMAIL ?? "infohechomadera@gmail.com";
  const adminUrl = `${SITE_URL}/admin/orders/${encodeURIComponent(order.order_id)}`;

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#404040;border-bottom:1px solid #f5f5f5;">
          ${item.title}${item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </td>
        <td style="padding:6px 0;font-size:13px;color:#0a0a0a;text-align:right;border-bottom:1px solid #f5f5f5;">
          ${formatCOP(item.unit_price * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e5e5e5;">

        <tr>
          <td style="padding:20px 24px;background:#0a0a0a;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#fafafa;text-transform:uppercase;letter-spacing:0.1em;">
              Nuevo pago aprobado
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0a0a0a;">
              ${formatCOP(order.total_cop)}
            </p>
            <p style="margin:0 0 20px;font-size:12px;color:#666;">Orden: <strong>${order.order_id}</strong></p>

            ${buyerEmail || buyerName ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f5f5f5;padding:12px 14px;">
              <tr><td style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#666;padding-bottom:8px;">Cliente</td></tr>
              ${buyerName ? `<tr><td style="font-size:13px;color:#0a0a0a;">${buyerName}</td></tr>` : ""}
              ${buyerEmail ? `<tr><td style="font-size:13px;color:#404040;">${buyerEmail}</td></tr>` : ""}
            </table>` : ""}

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td colspan="2" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#666;padding-bottom:8px;">
                  Ítems
                </td>
              </tr>
              ${itemsRows}
              <tr>
                <td style="padding-top:10px;font-size:13px;font-weight:600;color:#0a0a0a;">Total</td>
                <td style="padding-top:10px;font-size:14px;font-weight:700;color:#0a0a0a;text-align:right;">${formatCOP(order.total_cop)}</td>
              </tr>
            </table>

            <a href="${adminUrl}" style="display:inline-block;background:#0a0a0a;color:#fafafa;font-size:13px;font-weight:500;padding:10px 20px;text-decoration:none;">
              Ver en panel admin →
            </a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail({
    from,
    to: [to],
    subject: `[Nuevo pago] ${formatCOP(order.total_cop)} · Orden ${order.order_id}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Email a gerencia — lead nuevo del configurador (W3). Sin teléfono ni fotos.
// ---------------------------------------------------------------------------
const escaparHtml = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export async function sendNewLeadAlertToSeller({
  leadId,
  nombre,
  ciudad,
  resumen,
  rangoMin,
  rangoMax,
}: {
  leadId: string;
  nombre: string;
  ciudad: string;
  resumen: string;
  rangoMin: number;
  rangoMax: number;
}): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Hechomadera <info@hechomadera.com>";
  const to = process.env.CONTACT_TO_EMAIL ?? "infohechomadera@gmail.com";
  const url = `${SITE_URL}/admin/leads/${encodeURIComponent(leadId)}`;
  const html = `
<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px 16px;background:#fafafa;font-family:system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:24px;">
    <p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#666;">Lead nuevo del configurador</p>
    <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0a0a0a;">${escaparHtml(nombre)} · ${escaparHtml(ciudad)}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#404040;">${escaparHtml(resumen)}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#0a0a0a;">Rango: <strong>${formatCOP(rangoMin)} – ${formatCOP(rangoMax)}</strong></p>
    <a href="${url}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:10px 18px;font-size:13px;text-decoration:none;">Ver el lead</a>
  </div>
</body></html>`;
  await sendEmail({ from, to: [to], subject: `Lead nuevo: ${nombre.slice(0, 60)} (${ciudad})`, html });
}

// ---------------------------------------------------------------------------
// Pago de un lead (W5): al cliente (si dejó correo) y a gerencia. Sin teléfono.
// ---------------------------------------------------------------------------
const CONCEPTO: Record<string, string> = { diseno: "el diseño", anticipo: "el anticipo", saldo: "el saldo" };

export async function avisarPagoLead({ leadId, tipo, monto }: { leadId: string; tipo: string; monto: number }): Promise<void> {
  const { data } = await clienteSistema()
    .from("leads")
    .select("ciudad, producto, clientes(nombre, email, datos_borrados_at)")
    .eq("id", leadId)
    .maybeSingle<{ ciudad: string; producto: string; clientes: { nombre: string; email: string | null; datos_borrados_at: string | null } | null }>();
  if (!data) return;
  const from = process.env.RESEND_FROM ?? "Hechomadera <info@hechomadera.com>";
  const concepto = CONCEPTO[tipo] ?? "tu pago";
  const cli = data.clientes;
  const caja = (contenido: string) => `
<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px 16px;background:#fafafa;font-family:system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:24px;">${contenido}</div>
</body></html>`;

  if (cli?.email && !cli.datos_borrados_at) {
    const siguiente =
      tipo === "diseno"
        ? "Nuestro equipo empieza tu diseño. Te enviaremos la propuesta en máximo 48 horas."
        : tipo === "anticipo"
          ? "Con este anticipo empezamos la producción. Te contaremos cada avance."
          : "Tu proyecto quedó pagado por completo. ¡Gracias por confiar en Hechomadera!";
    await sendEmail({
      from,
      to: [cli.email],
      subject: `Recibimos el pago de ${concepto} — Hechomadera`,
      html: caja(`
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0a0a0a;">Hola ${escaparHtml(cli.nombre.split(" ")[0] ?? "")}, recibimos tu pago</p>
    <p style="margin:0 0 12px;font-size:14px;color:#404040;">Pagaste ${concepto} de tu proyecto en ${escaparHtml(data.ciudad)}: <strong>${formatCOP(monto)}</strong>.</p>
    <p style="margin:0 0 16px;font-size:14px;color:#404040;">${siguiente}</p>
    <a href="${getWaLink("Hola, acabo de hacer un pago en hechomadera.com.")}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:10px 18px;font-size:13px;text-decoration:none;">Escríbenos por WhatsApp</a>`),
      reply_to: "info@hechomadera.com",
    });
  }

  const to = process.env.CONTACT_TO_EMAIL ?? "infohechomadera@gmail.com";
  await sendEmail({
    from,
    to: [to],
    subject: `Pago de ${concepto}: ${formatCOP(monto)} (${data.ciudad})`,
    html: caja(`
    <p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#666;">Pago de un lead</p>
    <p style="margin:0 0 16px;font-size:14px;color:#0a0a0a;">Pagó ${concepto}: <strong>${formatCOP(monto)}</strong> · ${escaparHtml(data.ciudad)}</p>
    <a href="${SITE_URL}/admin/leads/${encodeURIComponent(leadId)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:10px 18px;font-size:13px;text-decoration:none;">Ver el lead</a>`),
  });
}

// ---------------------------------------------------------------------------
// Alerta a gerencia: un pago que necesita revisión (W5). Nunca se pierde un peso sin que alguien lo vea.
// ---------------------------------------------------------------------------
const MOTIVO_ALERTA: Record<string, string> = {
  monto: "Mercado Pago aprobó un pago que no cuadra con el valor cobrado. No se contó.",
  valor_cambio: "Llegó un pago calculado con un valor que ya cambió (cobro viejo). No se contó: devolver o cobrar la diferencia.",
  repetido: "Llegó un pago repetido o fuera de orden. No se contó: devolver si corresponde.",
  devuelto: "Mercado Pago informa que un pago fue devuelto o tuvo contracargo. Ya no cuenta como pagado.",
  reclamo: "Mercado Pago abrió un reclamo sobre un pago aprobado.",
  sin_orden: "Entró un pago aprobado que no corresponde a ninguna orden de la web (pudo ser borrada). Revisar y devolver.",
  prueba_en_produccion: "Llegó un pago de PRUEBA al sitio de producción. Se ignoró.",
  cerrado: "Llegó un pago en un lead cerrado (no aprobó, datos borrados o cancelado). No se contó: devolver.",
  prueba: "Llegó un pago de PRUEBA en un lead real. No se contó.",
  en_revision: "Llegó un pago en un lead que tiene otro pago devuelto sin resolver. No se contó: revisar.",
  error_base: "La base no pudo registrar un pago después de varios intentos. Revisar YA en Mercado Pago y en Supabase.",
  saldo_negativo: "Operflow informó un valor ajustado que no deja saldo: hay que devolver la diferencia al cliente.",
};

export async function avisarPagoParaRevisar({
  alerta,
  mpPagoId,
  monto,
  leadId,
}: {
  alerta: string;
  mpPagoId: number | null;
  monto: number | null;
  leadId?: string | null;
}): Promise<void> {
  const from = process.env.RESEND_FROM ?? "Hechomadera <info@hechomadera.com>";
  const to = process.env.CONTACT_TO_EMAIL ?? "infohechomadera@gmail.com";
  const enlace = leadId
    ? `<a href="${SITE_URL}/admin/leads/${encodeURIComponent(leadId)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:10px 18px;font-size:13px;text-decoration:none;">Ver el lead</a>`
    : `<p style="margin:0;font-size:13px;color:#404040;">Búscalo en Mercado Pago con el número de pago.</p>`;
  await sendEmail({
    from,
    to: [to],
    subject: `Revisar pago${mpPagoId ? ` ${mpPagoId}` : ""} — Hechomadera`,
    html: `
<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px 16px;background:#fafafa;font-family:system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:24px;">
    <p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#b91c1c;">Pago para revisar</p>
    <p style="margin:0 0 12px;font-size:14px;color:#0a0a0a;">${escaparHtml(MOTIVO_ALERTA[alerta] ?? "Un pago necesita revisión.")}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#404040;">Pago de Mercado Pago: <strong>${mpPagoId ?? "—"}</strong> · Valor: <strong>${monto != null ? formatCOP(monto) : "—"}</strong></p>
    ${enlace}
  </div>
</body></html>`,
  });
}
