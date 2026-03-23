import { NextResponse } from "next/server";
import { fetchLatestPaymentByExternalReference, normalizePaymentState } from "@/lib/mercadopago";

export const runtime = "nodejs";

/**
 * GET /api/payments/mercadopago/reference/:externalReference
 * Devuelve el ultimo pago encontrado para una referencia externa.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ externalReference: string }> },
) {
  const { externalReference } = await params;
  const result = await fetchLatestPaymentByExternalReference(externalReference);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, details: result.details },
      { status: result.status },
    );
  }

  const p = result.payment;
  return NextResponse.json({
    ok: true,
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
