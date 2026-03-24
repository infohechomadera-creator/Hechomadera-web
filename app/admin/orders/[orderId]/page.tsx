import type { Metadata } from "next";
import Link from "next/link";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getOrder } from "@/lib/orders-store";

export const metadata: Metadata = {
  title: "Admin · Detalle de orden",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { token } = await searchParams;
  const authorized = isValidAdminToken(token ?? null);

  if (!authorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin (protegido)</h1>
        <p className="mt-4 text-sm text-ink-muted">Token inválido o faltante.</p>
      </div>
    );
  }

  const order = await getOrder(orderId);
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Orden no encontrada</h1>
        <p className="mt-4 text-sm text-ink-muted">No existe la orden {orderId} en el store actual.</p>
        <Link href={`/admin?token=${encodeURIComponent(token!)}`} className="mt-6 inline-block underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">Detalle de orden</h1>
        <Link href={`/admin?token=${encodeURIComponent(token!)}`} className="text-sm underline text-ink-muted hover:text-ink">
          ← Volver al listado
        </Link>
      </div>

      <div className="mt-6 grid gap-3 rounded border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-2">
        <p>
          <strong>Orden:</strong> {order.order_id}
        </p>
        <p>
          <strong>Estado:</strong> {order.status}
        </p>
        <p>
          <strong>Total COP:</strong> {order.total_cop.toLocaleString("es-CO")}
        </p>
        <p>
          <strong>Referencia fuente:</strong> {order.source_reference ?? "-"}
        </p>
        <p>
          <strong>Creada:</strong> {new Date(order.created_at).toLocaleString("es-CO")}
        </p>
        <p>
          <strong>Actualizada:</strong> {new Date(order.updated_at).toLocaleString("es-CO")}
        </p>
      </div>

      <div className="mt-6 rounded border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="font-semibold text-ink">Pago</h2>
        <ul className="mt-2 space-y-1 text-ink-muted">
          <li>
            <strong className="text-ink">payment_id:</strong> {order.payment.id ?? "-"}
          </li>
          <li>
            <strong className="text-ink">status:</strong> {order.payment.status ?? "-"}
          </li>
          <li>
            <strong className="text-ink">normalized_status:</strong> {order.payment.normalized_status ?? "-"}
          </li>
          <li>
            <strong className="text-ink">status_detail:</strong> {order.payment.status_detail ?? "-"}
          </li>
          <li>
            <strong className="text-ink">payment_method_id:</strong> {order.payment.payment_method_id ?? "-"}
          </li>
        </ul>
      </div>

      <div className="mt-6 rounded border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="font-semibold text-ink">Items</h2>
        <ul className="mt-3 space-y-2">
          {order.items.map((i, idx) => (
            <li key={`${i.title}-${idx}`} className="border border-neutral-100 p-3">
              <p className="font-medium text-ink">{i.title}</p>
              <p className="text-ink-muted">
                Cantidad: {i.quantity} · Unitario: {i.unit_price.toLocaleString("es-CO")} {i.currency_id}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
