/**
 * Notificaciones de email para el flujo de pago.
 * Usa Resend (RESEND_API_KEY) configurado en Vercel.
 * Se disparan desde el webhook de Mercado Pago al aprobar un pago.
 */

import type { StoredOrder } from "@/lib/orders-store";

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
