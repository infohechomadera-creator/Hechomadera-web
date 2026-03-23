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

type MercadoPagoErrorShape = {
  message?: string;
  cause?: unknown;
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

  const data = (await res.json()) as MercadoPagoPayment & MercadoPagoErrorShape;

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

export async function fetchLatestPaymentByExternalReference(externalReference: string): Promise<{
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

  const cleanReference = String(externalReference).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 256);
  if (!cleanReference) {
    return { ok: false, status: 400, error: "external_reference invalida." };
  }

  const url = new URL("https://api.mercadopago.com/v1/payments/search");
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", "1");
  url.searchParams.set("external_reference", cleanReference);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = (await res.json()) as MercadoPagoErrorShape & {
    results?: MercadoPagoPayment[];
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.message ?? "Mercado Pago no devolvio resultados para la referencia.",
      details: data.cause ?? data,
    };
  }

  const payment = data.results?.[0];
  if (!payment) {
    return {
      ok: false,
      status: 404,
      error: "No existe pago para esa external_reference.",
      details: data,
    };
  }

  return { ok: true, payment };
}

export function normalizePaymentState(status: string): "approved" | "pending" | "rejected" | "unknown" {
  if (status === "approved") return "approved";
  if (status === "pending" || status === "in_process" || status === "in_mediation") return "pending";
  if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") return "rejected";
  return "unknown";
}
