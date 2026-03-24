import { NextResponse } from "next/server";
import { fetchLatestPaymentByExternalReference, normalizePaymentState } from "@/lib/mercadopago";
import { getOrder } from "@/lib/orders-store";

export const runtime = "nodejs";

/**
 * GET /api/payments/orders/:orderId
 * Estado de una orden MVP (sin BD), resolviendo por external_reference en Mercado Pago.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const stored = await getOrder(orderId);

  if (stored) {
    return NextResponse.json({
      ok: true,
      source: "orders-store",
      order: stored,
    });
  }

  const result = await fetchLatestPaymentByExternalReference(orderId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, order_id: orderId, error: result.error, details: result.details },
      { status: result.status },
    );
  }

  const p = result.payment;
  return NextResponse.json({
    ok: true,
    order_id: orderId,
    payment: {
      id: p.id,
      status: p.status,
      status_detail: p.status_detail,
      normalized_status: normalizePaymentState(p.status),
      external_reference: p.external_reference,
      transaction_amount: p.transaction_amount,
      currency_id: p.currency_id,
      payment_type_id: p.payment_type_id,
      payment_method_id: p.payment_method_id,
      date_created: p.date_created,
      date_approved: p.date_approved,
    },
  });
}
