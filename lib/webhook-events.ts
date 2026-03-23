export type WebhookEventRecord = {
  provider: "mercadopago";
  event_type: string;
  action: string | null;
  resource_id: string | null;
  payment_id: number | null;
  order_id: string | null;
  status: string | null;
  normalized_status: "approved" | "pending" | "rejected" | "unknown" | null;
  status_detail: string | null;
  received_at: string;
};

/**
 * Buffer en memoria para trazabilidad operativa corta (sin BD).
 * Nota: en serverless puede resetear entre invocaciones.
 */
const globalState = globalThis as typeof globalThis & {
  __hmWebhookEvents?: WebhookEventRecord[];
  __hmWebhookSeen?: Set<string>;
};

if (!globalState.__hmWebhookEvents) globalState.__hmWebhookEvents = [];
if (!globalState.__hmWebhookSeen) globalState.__hmWebhookSeen = new Set<string>();

const MAX_EVENTS = 100;

export function saveWebhookEvent(record: WebhookEventRecord): void {
  globalState.__hmWebhookEvents!.unshift(record);
  if (globalState.__hmWebhookEvents!.length > MAX_EVENTS) {
    globalState.__hmWebhookEvents!.length = MAX_EVENTS;
  }
}

export function listWebhookEvents(limit = 20): WebhookEventRecord[] {
  const n = Math.max(1, Math.min(100, Number(limit) || 20));
  return globalState.__hmWebhookEvents!.slice(0, n);
}

export function markPaymentProcessed(paymentId: number | null): {
  dedupeKey: string | null;
  alreadyProcessed: boolean;
} {
  if (!paymentId) return { dedupeKey: null, alreadyProcessed: false };
  const key = `mp:payment:${paymentId}`;
  if (globalState.__hmWebhookSeen!.has(key)) {
    return { dedupeKey: key, alreadyProcessed: true };
  }
  globalState.__hmWebhookSeen!.add(key);
  return { dedupeKey: key, alreadyProcessed: false };
}
