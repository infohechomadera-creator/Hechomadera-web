export type MercadoPagoPayment = {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string;
  date_approved?: string | null;
  payment_type_id?: string;
  payment_method_id?: string;
};

function getAccessToken(): string | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  return token;
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<{
  ok: true;
  payment: MercadoPagoPayment;
} | {
  ok: false;
  status: number;
  error: string;
  details?: unknown;
}> {
  const token = getAccessToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      error: "Falta MERCADOPAGO_ACCESS_TOKEN en variables de entorno.",
    };
  }

  const cleanPaymentId = String(paymentId).replace(/[^\d]/g, "");
  if (!cleanPaymentId) {
    return { ok: false, status: 400, error: "payment_id invalido." };
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${cleanPaymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = (await res.json()) as MercadoPagoPayment & {
    message?: string;
    cause?: unknown;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.message ?? "Mercado Pago no devolvio el pago solicitado.",
      details: data.cause ?? data,
    };
  }

  return { ok: true, payment: data };
}

export function normalizePaymentState(status: string): "approved" | "pending" | "rejected" | "unknown" {
  if (status === "approved") return "approved";
  if (status === "pending" || status === "in_process" || status === "in_mediation") return "pending";
  if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") return "rejected";
  return "unknown";
}
