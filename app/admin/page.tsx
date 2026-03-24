import type { Metadata } from "next";
import Link from "next/link";
import { isValidAdminToken } from "@/lib/admin-auth";
import { listOrders, type StoredOrder } from "@/lib/orders-store";

export const metadata: Metadata = {
  title: "Admin · Órdenes",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    token?: string;
    status?: string;
    limit?: string;
    from?: string;
    to?: string;
  }>;
};

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function computeKPIs(orders: StoredOrder[]) {
  const approved = orders.filter((o) => o.status === "approved");
  const rejected = orders.filter((o) => o.status === "rejected");
  const pending = orders.filter((o) => o.status === "pending");
  const abandoned = orders.filter((o) => o.status === "created");

  const totalVentas = approved.reduce((acc, o) => acc + o.total_cop, 0);
  const ticketPromedio = approved.length > 0 ? totalVentas / approved.length : 0;
  const tasaAprobacion =
    approved.length + rejected.length > 0
      ? Math.round((approved.length / (approved.length + rejected.length)) * 100)
      : null;

  return { approved, rejected, pending, abandoned, totalVentas, ticketPromedio, tasaAprobacion };
}

function filterByDate(orders: StoredOrder[], from?: string, to?: string): StoredOrder[] {
  return orders.filter((o) => {
    const date = o.created_at.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

type KPICardProps = {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
};

function KPICard({ label, value, sub, highlight }: KPICardProps) {
  return (
    <div className={`border p-5 ${highlight ? "border-ink bg-ink text-paper" : "border-neutral-200 bg-white"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${highlight ? "text-paper/60" : "text-ink-muted"}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${highlight ? "text-paper" : "text-ink"}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${highlight ? "text-paper/50" : "text-ink-muted"}`}>{sub}</p>
      )}
    </div>
  );
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { token, status, limit, from, to } = await searchParams;
  const authorized = isValidAdminToken(token ?? null);

  if (!authorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin (protegido)</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Acceso restringido. Abre esta ruta con{" "}
          <code className="rounded bg-neutral-100 px-1">?token=TU_ADMIN_API_TOKEN</code>.
        </p>
      </div>
    );
  }

  const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const all = await listOrders(parsedLimit);

  // Aplicar filtro de fechas
  const dateFiltered = filterByDate(all, from, to);

  // Aplicar filtro de estado sobre el conjunto con fecha
  const rows = status ? dateFiltered.filter((o) => o.status === status) : dateFiltered;

  // KPIs calculados sobre órdenes con fecha aplicada (sin filtro de estado)
  const kpis = computeKPIs(dateFiltered);

  const tokenQ = encodeURIComponent(token!);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin · Órdenes</h1>
        <Link
          href={`/api/admin/orders/export?token=${tokenQ}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
          className="inline-flex items-center justify-center border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Exportar CSV
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Total vendido"
          value={formatCOP(kpis.totalVentas)}
          sub={`${kpis.approved.length} orden${kpis.approved.length !== 1 ? "es" : ""} aprobada${kpis.approved.length !== 1 ? "s" : ""}`}
          highlight
        />
        <KPICard
          label="Tasa aprobación"
          value={kpis.tasaAprobacion !== null ? `${kpis.tasaAprobacion}%` : "—"}
          sub={kpis.tasaAprobacion !== null ? `${kpis.approved.length} aprobadas / ${kpis.rejected.length} rechazadas` : "Sin datos aún"}
        />
        <KPICard
          label="Ticket promedio"
          value={kpis.ticketPromedio > 0 ? formatCOP(kpis.ticketPromedio) : "—"}
          sub="Por orden aprobada"
        />
        <KPICard
          label="Aprobadas"
          value={String(kpis.approved.length)}
          sub="Pago confirmado"
        />
        <KPICard
          label="Pendientes"
          value={String(kpis.pending.length)}
          sub="En revisión MP"
        />
        <KPICard
          label="Abandonadas"
          value={String(kpis.abandoned.length)}
          sub="Iniciaron sin pagar"
        />
      </div>

      {/* Filtros */}
      <form method="get" className="mt-8 grid gap-3 rounded border border-neutral-200 bg-white p-4 sm:grid-cols-5">
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
          Desde
          <input
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="mt-1 block w-full border border-neutral-300 bg-paper px-2 py-2 text-sm text-ink"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Hasta
          <input
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="mt-1 block w-full border border-neutral-300 bg-paper px-2 py-2 text-sm text-ink"
          />
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

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink"
          >
            Aplicar
          </button>
          <Link
            href={`/admin?token=${tokenQ}`}
            className="border border-neutral-200 px-4 py-2 text-sm text-ink-muted hover:border-neutral-400"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {/* Conteo */}
      <p className="mt-3 text-xs text-ink-muted">
        Mostrando {rows.length} de {dateFiltered.length} órdenes
        {(from || to) && (
          <span className="ml-1 text-ink">
            ({from ?? "…"} → {to ?? "hoy"})
          </span>
        )}
      </p>

      {/* Tabla */}
      <div className="mt-3 overflow-x-auto border border-neutral-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2">Orden</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Total COP</th>
              <th className="px-3 py-2">Pago MP</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.order_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(o.order_id)}?token=${tokenQ}`}
                    className="underline"
                  >
                    {o.order_id}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.status === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : o.status === "rejected"
                      ? "bg-red-50 text-red-700"
                      : o.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-neutral-100 text-ink-muted"
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{formatCOP(o.total_cop)}</td>
                <td className="px-3 py-2 text-ink-muted">{o.payment.status ?? "—"}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {new Date(o.created_at).toLocaleDateString("es-CO")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">
                  No hay órdenes con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
