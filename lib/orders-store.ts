import { Redis } from "@upstash/redis";

type OrderStatus = "created" | "pending" | "approved" | "rejected" | "unknown";

export type StoredOrder = {
  order_id: string;
  source_reference: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  preference_id: string | null;
  redirect_url: string | null;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "COP";
  }>;
  total_cop: number;
  payment: {
    id: number | null;
    status: string | null;
    normalized_status: OrderStatus | null;
    status_detail: string | null;
    date_created: string | null;
    date_approved: string | null;
    payment_method_id: string | null;
  };
};

type NewOrderInput = {
  order_id: string;
  source_reference: string | null;
  preference_id: string | null;
  redirect_url: string | null;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "COP";
  }>;
};

const globalState = globalThis as typeof globalThis & {
  __hmOrdersRedis?: Redis | null;
  __hmOrdersMem?: Record<string, StoredOrder>;
};

if (!globalState.__hmOrdersMem) globalState.__hmOrdersMem = {};

const ORDERS_KEY_PREFIX = "hm:orders:";
const ORDERS_INDEX_KEY = "hm:orders:index";
const MAX_INDEX = 2000;

function getRedisClient(): Redis | null {
  if (globalState.__hmOrdersRedis !== undefined) return globalState.__hmOrdersRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    globalState.__hmOrdersRedis = null;
    return null;
  }
  globalState.__hmOrdersRedis = new Redis({ url, token });
  return globalState.__hmOrdersRedis;
}

function toOrderStatus(status: string | null | undefined): OrderStatus {
  if (status === "approved") return "approved";
  if (status === "pending" || status === "in_process" || status === "in_mediation") return "pending";
  if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") return "rejected";
  if (status === "created") return "created";
  return "unknown";
}

export async function saveNewOrder(input: NewOrderInput): Promise<StoredOrder> {
  const now = new Date().toISOString();
  const total = input.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const order: StoredOrder = {
    order_id: input.order_id,
    source_reference: input.source_reference,
    status: "created",
    created_at: now,
    updated_at: now,
    preference_id: input.preference_id,
    redirect_url: input.redirect_url,
    items: input.items,
    total_cop: total,
    payment: {
      id: null,
      status: null,
      normalized_status: null,
      status_detail: null,
      date_created: null,
      date_approved: null,
      payment_method_id: null,
    },
  };

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`${ORDERS_KEY_PREFIX}${order.order_id}`, order);
      await redis.lpush(ORDERS_INDEX_KEY, order.order_id);
      await redis.ltrim(ORDERS_INDEX_KEY, 0, MAX_INDEX - 1);
      return order;
    } catch (error) {
      console.error("[OrdersStore] Redis write failed, fallback to memory", error);
    }
  }

  globalState.__hmOrdersMem![order.order_id] = order;
  return order;
}

export async function getOrder(orderId: string): Promise<StoredOrder | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const row = await redis.get<StoredOrder>(`${ORDERS_KEY_PREFIX}${orderId}`);
      if (row && typeof row === "object") return row;
      return null;
    } catch (error) {
      console.error("[OrdersStore] Redis read failed, fallback to memory", error);
    }
  }
  return globalState.__hmOrdersMem![orderId] ?? null;
}

export async function updateOrderFromPayment(args: {
  orderId: string;
  payment: {
    id: number;
    status: string;
    status_detail?: string;
    date_created?: string;
    date_approved?: string | null;
    payment_method_id?: string;
  };
}): Promise<StoredOrder | null> {
  const prev = await getOrder(args.orderId);
  if (!prev) return null;

  const next: StoredOrder = {
    ...prev,
    updated_at: new Date().toISOString(),
    status: toOrderStatus(args.payment.status),
    payment: {
      id: args.payment.id,
      status: args.payment.status,
      normalized_status: toOrderStatus(args.payment.status),
      status_detail: args.payment.status_detail ?? null,
      date_created: args.payment.date_created ?? null,
      date_approved: args.payment.date_approved ?? null,
      payment_method_id: args.payment.payment_method_id ?? null,
    },
  };

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`${ORDERS_KEY_PREFIX}${next.order_id}`, next);
      return next;
    } catch (error) {
      console.error("[OrdersStore] Redis update failed, fallback to memory", error);
    }
  }

  globalState.__hmOrdersMem![next.order_id] = next;
  return next;
}

export async function listOrders(limit = 50): Promise<StoredOrder[]> {
  const n = Math.max(1, Math.min(500, Number(limit) || 50));
  const redis = getRedisClient();
  if (redis) {
    try {
      const ids = await redis.lrange<string[]>(ORDERS_INDEX_KEY, 0, n - 1);
      const uniqueIds = Array.from(new Set((ids ?? []).filter(Boolean)));
      if (!uniqueIds.length) return [];
      const rows = await Promise.all(uniqueIds.map((id) => redis.get<StoredOrder>(`${ORDERS_KEY_PREFIX}${id}`)));
      return rows.filter((x): x is StoredOrder => Boolean(x));
    } catch (error) {
      console.error("[OrdersStore] Redis list failed, fallback to memory", error);
    }
  }

  return Object.values(globalState.__hmOrdersMem!)
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
    .slice(0, n);
}
