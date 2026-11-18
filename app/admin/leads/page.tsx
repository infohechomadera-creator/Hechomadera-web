import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { clienteUsuario } from "@/lib/supabase/servidor";
import { ETIQUETA_ESTADO, fechaCorta, nombreDiseno, nombreForma, pesos, type ConfiguracionGuardada } from "@/lib/leads";

export const metadata: Metadata = { title: "Admin · Leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Fila = {
  id: string;
  ciudad: string;
  estado: string;
  rango_min: number | null;
  rango_max: number | null;
  configuracion: ConfiguracionGuardada;
  creado_at: string;
  clientes: { nombre: string; telefono: string } | null;
  archivos: { count: number }[];
};

export default async function AdminLeadsPage() {
  // El middleware ya exige gerencia; la lectura respeta RLS.
  const supabase = await clienteUsuario();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, ciudad, estado, rango_min, rango_max, configuracion, creado_at, clientes(nombre, telefono), archivos(count)")
    .order("creado_at", { ascending: false })
    .limit(100)
    .returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>{" "}
            · Leads
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Leads del configurador</h1>
          <p className="mt-2 text-sm text-ink-muted">Los 100 más recientes. El panel del asesor llega en el siguiente hito.</p>
        </div>
        <LogoutButton />
      </div>

      {error && <p className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-800">No se pudieron leer los leads.</p>}
      {!error && (leads ?? []).length === 0 && <p className="mt-8 text-sm text-ink-muted">Todavía no hay leads.</p>}

      {(leads ?? []).length > 0 && (
        <ul className="mt-8 divide-y divide-neutral-200 border border-neutral-200 bg-white">
          {(leads ?? []).map((l) => (
            <li key={l.id}>
              <Link href={`/admin/leads/${l.id}`} className="flex flex-col gap-1 p-4 hover:bg-neutral-50 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {l.clientes?.nombre ?? "—"} <span className="text-sm font-normal text-ink-muted">· {l.clientes?.telefono}</span>
                  </p>
                  <p className="text-sm text-ink-muted">
                    {l.ciudad} · Cocina {nombreForma(l.configuracion?.forma).toLowerCase()} · {nombreDiseno(l.configuracion?.diseno)} ·{" "}
                    {l.archivos?.[0]?.count ?? 0} foto(s)
                  </p>
                </div>
                <div className="text-sm md:text-right">
                  <p className="text-ink">
                    {pesos(l.rango_min)} – {pesos(l.rango_max)}
                  </p>
                  <p className="text-ink-muted">
                    {ETIQUETA_ESTADO[l.estado] ?? l.estado} · {fechaCorta(l.creado_at)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
