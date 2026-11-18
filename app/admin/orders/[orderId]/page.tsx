import type { Metadata } from "next";
import Link from "next/link";
import { getOrder } from "@/lib/orders-store";

export const metadata: Metadata = {
  title: "Admin · Detalle de orden",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) {
    return (
      <div className="contenedor py-14 md:py-20">
        <div className="tarjeta mx-auto max-w-3xl p-7 md:p-10">
          <h1 className="titulo-seccion">Orden no encontrada</h1>
          <p className="mt-4 break-words text-sm text-ink-muted">No existe la orden {orderId} en el store actual.</p>
          <Link href="/admin" className="boton-borde mt-6">
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="titulo-seccion">Detalle de orden</h1>
          <Link href="/admin" className="boton-neutro !py-2.5">
            ← Volver al listado
          </Link>
        </div>

        <div className="tarjeta mt-8 grid gap-x-8 gap-y-3 break-words p-7 text-sm text-ink-muted sm:grid-cols-2">
          <p><strong className="font-medium text-ink">Orden:</strong> {order.order_id}</p>
          <p><strong className="font-medium text-ink">Estado:</strong> {order.status}</p>
          <p><strong className="font-medium text-ink">Total COP:</strong> {order.total_cop.toLocaleString("es-CO")}</p>
          <p><strong className="font-medium text-ink">Referencia fuente:</strong> {order.source_reference ?? "-"}</p>
          <p><strong className="font-medium text-ink">Creada:</strong> {new Date(order.created_at).toLocaleString("es-CO")}</p>
          <p><strong className="font-medium text-ink">Actualizada:</strong> {new Date(order.updated_at).toLocaleString("es-CO")}</p>
        </div>

        <div className="tarjeta mt-3 p-7 text-sm">
          <h2 className="titulo-tarjeta">Pago</h2>
          <ul className="mt-4 space-y-2 break-words text-ink-muted">
            <li><strong className="font-medium text-ink">payment_id:</strong> {order.payment.id ?? "-"}</li>
            <li><strong className="font-medium text-ink">status:</strong> {order.payment.status ?? "-"}</li>
            <li><strong className="font-medium text-ink">normalized_status:</strong> {order.payment.normalized_status ?? "-"}</li>
            <li><strong className="font-medium text-ink">status_detail:</strong> {order.payment.status_detail ?? "-"}</li>
            <li><strong className="font-medium text-ink">payment_method_id:</strong> {order.payment.payment_method_id ?? "-"}</li>
          </ul>
        </div>

        <div className="tarjeta mt-3 p-7 text-sm">
          <h2 className="titulo-tarjeta">Items</h2>
          <ul className="mt-4 space-y-2">
            {order.items.map((i, idx) => (
              <li key={`${i.title}-${idx}`} className="rounded-button border border-cloud bg-paper-dim px-4 py-3">
                <p className="font-medium text-ink">{i.title}</p>
                <p className="text-ink-muted">
                  Cantidad: {i.quantity} · Unitario: {i.unit_price.toLocaleString("es-CO")} {i.currency_id}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
