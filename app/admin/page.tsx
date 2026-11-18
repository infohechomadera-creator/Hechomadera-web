import type { Metadata } from "next";
import Link from "next/link";
import { listOrders, type StoredOrder } from "@/lib/orders-store";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  title: "Admin · Órdenes",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
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
    <div className={`p-6 ${highlight ? "bloque-oscuro" : "tarjeta"}`}>
      <p className={`text-caption font-medium uppercase tracking-[0.08em] ${highlight ? "text-ash" : "text-ink-soft"}`}>
        {label}
      </p>
      <p className={`mt-2 break-words font-display text-heading-sm font-semibold leading-tight tracking-[-0.015em] ${highlight ? "text-snow" : "text-ink"}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-caption ${highlight ? "text-ash" : "text-ink-muted"}`}>{sub}</p>
      )}
    </div>
  );
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, limit, from, to } = await searchParams;
  const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const all = await listOrders(parsedLimit);

  // Aplicar filtro de fechas
  const dateFiltered = filterByDate(all, from, to);

  // Aplicar filtro de estado sobre el conjunto con fecha
  const rows = status ? dateFiltered.filter((o) => o.status === status) : dateFiltered;

  // KPIs calculados sobre órdenes con fecha aplicada (sin filtro de estado)
  const kpis = computeKPIs(dateFiltered);

  return (
    <div className="contenedor py-10 md:py-14">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo-seccion">Admin · Órdenes</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/admin/orders/export${from || to ? `?${from ? `from=${from}` : ""}${from && to ? "&" : ""}${to ? `to=${to}` : ""}` : ""}`}
            className="boton-primario !py-2.5"
          >
            Exportar CSV
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      <form method="get" className="tarjeta mt-3 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">

        <label className="eyebrow block">
          Estado
          <select
            name="status"
            defaultValue={status ?? ""}
            className="campo mt-2 block normal-case tracking-normal"
          >
            <option value="">Todos</option>
            <option value="created">created</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="unknown">unknown</option>
          </select>
        </label>

        <label className="eyebrow block">
          Desde
          <input
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="campo mt-2 block normal-case tracking-normal"
          />
        </label>

        <label className="eyebrow block">
          Hasta
          <input
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="campo mt-2 block normal-case tracking-normal"
          />
        </label>

        <label className="eyebrow block">
          Límite
          <input
            name="limit"
            type="number"
            min={1}
            max={200}
            defaultValue={String(parsedLimit)}
            className="campo mt-2 block normal-case tracking-normal"
          />
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            className="boton-primario flex-1"
          >
            Aplicar
          </button>
          <Link
            href="/admin"
            className="boton-neutro flex-1"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {/* Conteo */}
      <p className="mt-6 px-1 text-caption text-ink-muted">
        Mostrando {rows.length} de {dateFiltered.length} órdenes
        {(from || to) && (
          <span className="ml-1 text-ink">
            ({from ?? "…"} → {to ?? "hoy"})
          </span>
        )}
      </p>

      {/* Tabla */}
      <div className="tarjeta mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-cloud text-caption uppercase tracking-[0.08em] text-ink-soft">
            <tr>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Orden</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Estado</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Total COP</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Pago MP</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.order_id} className="border-b border-cloud last:border-b-0 hover:bg-paper-dim">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(o.order_id)}`}
                    className="whitespace-nowrap font-medium text-ink underline underline-offset-4 hover:text-ink-muted"
                  >
                    {o.order_id}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className={
                    o.status === "approved"
                      ? "etiqueta-llena"
                      : o.status === "rejected"
                      ? "etiqueta-ember"
                      : o.status === "pending"
                      ? "etiqueta bg-snow"
                      : "etiqueta bg-paper text-ink-muted"
                  }>
                    {o.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-ink">{formatCOP(o.total_cop)}</td>
                <td className="px-6 py-4 text-ink-muted">{o.payment.status ?? "—"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-ink-muted">
                  {new Date(o.created_at).toLocaleDateString("es-CO")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-ink-muted">
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
