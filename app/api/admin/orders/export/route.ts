import { listOrders } from "@/lib/orders-store";

export const runtime = "nodejs";

function esc(value: unknown): string {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replaceAll("\"", "\"\"")}"`;
  }
  return raw;
}

/**
 * GET /api/admin/orders/export?token=...
 * Exporta órdenes a CSV para análisis externo.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "500");
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const allOrders = await listOrders(limit);
  const orders = allOrders.filter((o) => {
    const date = o.created_at.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });

  const header = [
    "order_id",
    "status",
    "created_at",
    "updated_at",
    "total_cop",
    "payment_id",
    "payment_status",
    "payment_method_id",
    "source_reference",
  ].join(",");

  const rows = orders.map((o) =>
    [
      esc(o.order_id),
      esc(o.status),
      esc(o.created_at),
      esc(o.updated_at),
      esc(o.total_cop),
      esc(o.payment.id),
      esc(o.payment.status),
      esc(o.payment.payment_method_id),
      esc(o.source_reference),
    ].join(","),
  );

  const csv = `${header}\n${rows.join("\n")}`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"orders-export.csv\"",
    },
  });
}
