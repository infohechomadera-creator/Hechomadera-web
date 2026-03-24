import type { Metadata } from "next";
import Link from "next/link";
import { isValidAdminToken } from "@/lib/admin-auth";
import { listOrders } from "@/lib/orders-store";

export const metadata: Metadata = {
  title: "Admin · Órdenes",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ token?: string; status?: string; limit?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { token, status, limit } = await searchParams;
  const authorized = isValidAdminToken(token ?? null);

  if (!authorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin (protegido)</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Acceso restringido. Abre esta ruta con <code className="rounded bg-neutral-100 px-1">?token=TU_ADMIN_API_TOKEN</code>.
        </p>
      </div>
    );
  }

  const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const all = await listOrders(parsedLimit);
  const rows = status ? all.filter((o) => o.status === status) : all;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin · Órdenes</h1>
        <Link
          href={`/api/admin/orders/export?token=${encodeURIComponent(token!)}`}
          className="inline-flex items-center justify-center border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Exportar CSV
        </Link>
      </div>

      <form method="get" className="mt-6 grid gap-3 rounded border border-neutral-200 bg-white p-4 sm:grid-cols-4">
        <input type="hidden" name="token" value={token} />
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Estado
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 block w-full border border-neutral-300 bg-paper px-2 py-2 text-sm text-ink"
          >
            <option value="">Todos</option>
            <option value="created">created</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="unknown">unknown</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Límite
          <input
            name="limit"
            type="number"
            min={1}
            max={200}
            defaultValue={String(parsedLimit)}
            className="mt-1 block w-full border border-neutral-300 bg-paper px-2 py-2 text-sm text-ink"
          />
        </label>
        <div className="sm:col-span-2 sm:flex sm:items-end">
          <button type="submit" className="border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink">
            Aplicar filtros
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs text-ink-muted">
        Mostrando {rows.length} órdenes de {all.length} registradas (límite {parsedLimit}).
      </p>

      <div className="mt-4 overflow-x-auto border border-neutral-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2">Orden</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Total COP</th>
              <th className="px-3 py-2">Pago</th>
              <th className="px-3 py-2">Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.order_id} className="border-b border-neutral-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/orders/${encodeURIComponent(o.order_id)}?token=${encodeURIComponent(token!)}`} className="underline">
                    {o.order_id}
                  </Link>
                </td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.total_cop.toLocaleString("es-CO")}</td>
                <td className="px-3 py-2">{o.payment.status ?? "-"}</td>
                <td className="px-3 py-2">{new Date(o.updated_at).toLocaleString("es-CO")}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-ink-muted">
                  No hay órdenes con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
