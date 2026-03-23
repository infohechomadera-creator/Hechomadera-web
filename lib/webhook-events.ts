import { Redis } from "@upstash/redis";

export type WebhookEventRecord = {
  provider: "mercadopago";
  event_type: string;
  action: string | null;
  processed: boolean;
  resource_id: string | null;
  payment_id: number | null;
  order_id: string | null;
  status: string | null;
  normalized_status: "approved" | "pending" | "rejected" | "unknown" | null;
  status_detail: string | null;
  error: string | null;
  received_at: string;
};

/**
 * Buffer en memoria para trazabilidad operativa corta (sin BD).
 * Nota: en serverless puede resetear entre invocaciones.
 */
const globalState = globalThis as typeof globalThis & {
  __hmWebhookEvents?: WebhookEventRecord[];
  __hmWebhookSeen?: Set<string>;
  __hmUpstashRedis?: Redis | null;
};

if (!globalState.__hmWebhookEvents) globalState.__hmWebhookEvents = [];
if (!globalState.__hmWebhookSeen) globalState.__hmWebhookSeen = new Set<string>();

const MAX_EVENTS = 100;
const REDIS_KEY = "hm:webhook_events";

function getRedisClient(): Redis | null {
  if (globalState.__hmUpstashRedis !== undefined) return globalState.__hmUpstashRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    globalState.__hmUpstashRedis = null;
    return null;
  }

  globalState.__hmUpstashRedis = new Redis({ url, token });
  return globalState.__hmUpstashRedis;
}

export async function saveWebhookEvent(record: WebhookEventRecord): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.lpush(REDIS_KEY, record);
      await redis.ltrim(REDIS_KEY, 0, MAX_EVENTS - 1);
      return;
    } catch (error) {
      console.error("[WebhookEvents] Redis write failed, fallback to memory", error);
    }
  }

  globalState.__hmWebhookEvents!.unshift(record);
  if (globalState.__hmWebhookEvents!.length > MAX_EVENTS) {
    globalState.__hmWebhookEvents!.length = MAX_EVENTS;
  }
}

export async function listWebhookEvents(limit = 20): Promise<WebhookEventRecord[]> {
  const n = Math.max(1, Math.min(100, Number(limit) || 20));

  const redis = getRedisClient();
  if (redis) {
    try {
      const rows = await redis.lrange<WebhookEventRecord>(REDIS_KEY, 0, n - 1);
      if (Array.isArray(rows)) return rows;
    } catch (error) {
      console.error("[WebhookEvents] Redis read failed, fallback to memory", error);
    }
  }

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
