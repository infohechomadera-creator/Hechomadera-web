import type { Metadata } from "next";
import Link from "next/link";
import { FiltrosLeads } from "@/components/admin/FiltrosLeads";
import { rolActual } from "@/lib/sesion";
import { clienteUsuario } from "@/lib/supabase/servidor";
import { hoyEnColombia } from "@/lib/precios/fechas";
import {
  ESTADOS_A_MANO,
  ETIQUETA_ESTADO,
  leerFiltros,
  fechaCorta,
  fechaDia,
  nombreDiseno,
  nombreForma,
  pasoElFiltro,
  pesos,
  type ConfiguracionGuardada,
} from "@/lib/leads";

export const metadata: Metadata = { title: "Admin · Leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Fila = {
  id: string;
  ciudad: string;
  estado: string;
  pago_estado: string;
  asesor_id: string | null;
  proximo_contacto: string | null;
  rango_min: number | null;
  rango_max: number | null;
  configuracion: ConfiguracionGuardada;
  creado_at: string;
  clientes: { nombre: string; telefono: string } | null;
  archivos: { count: number }[];
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // El middleware deja entrar a gerencia y asesor; la lectura respeta RLS (el asesor solo recibe los suyos).
  const esGerencia = (await rolActual()) === "gerencia";
  const f = leerFiltros(await searchParams, esGerencia);
  const hoy = hoyEnColombia();
  const supabase = await clienteUsuario();

  let consulta = supabase
    .from("leads")
    .select(
      "id, ciudad, estado, pago_estado, asesor_id, proximo_contacto, rango_min, rango_max, configuracion, creado_at, clientes(nombre, telefono), archivos(count)",
    );
  if (f.estado) consulta = consulta.eq("estado", f.estado);
  if (f.filtro === "si") consulta = consulta.neq("pago_estado", "nada");
  if (f.filtro === "no") consulta = consulta.eq("pago_estado", "nada");
  if (f.asesor === "sin") consulta = consulta.is("asesor_id", null);
  else if (f.asesor) consulta = consulta.eq("asesor_id", f.asesor);
  // El asesor ve primero a quién le toca llamar; gerencia ve primero lo que acaba de llegar.
  consulta = esGerencia
    ? consulta.order("creado_at", { ascending: false })
    : consulta.order("proximo_contacto", { ascending: true, nullsFirst: false }).order("creado_at", { ascending: false });

  const [{ data: leads, error }, { data: nombres }] = await Promise.all([
    consulta.limit(100).returns<Fila[]>(),
    supabase.rpc("nombres_equipo"),
  ]);
  const equipo = (nombres ?? []) as { id: string; nombre: string }[];
  const nombre = new Map(equipo.map((n) => [n.id, n.nombre]));
  const lista = leads ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{esGerencia ? "Leads del configurador" : "Mis leads"}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {esGerencia ? "Los 100 más recientes. Asigna cada lead desde su ficha." : "Ordenados por próximo contacto."}
        </p>
      </div>

      <div className="mt-6">
        <FiltrosLeads
          actual={{ estado: f.estado, filtro: f.filtro, asesor: f.asesor }}
          filtros={[
            {
              clave: "estado",
              etiqueta: "Estado",
              todos: "Todos los estados",
              opciones: [...ESTADOS_A_MANO, "diseno_pagado" as const].map((e) => ({ valor: e, texto: ETIQUETA_ESTADO[e] })),
            },
            {
              clave: "filtro",
              etiqueta: "Pago del diseño",
              todos: "Con y sin pago",
              opciones: [
                { valor: "si", texto: "Pasó el filtro (pagó)" },
                { valor: "no", texto: "Sin pagar el diseño" },
              ],
            },
            ...(esGerencia
              ? [
                  {
                    clave: "asesor" as const,
                    etiqueta: "Asesor",
                    todos: "Todo el equipo",
                    opciones: [{ valor: "sin", texto: "Sin asignar" }, ...equipo.map((p) => ({ valor: p.id, texto: p.nombre }))],
                  },
                ]
              : []),
          ]}
        />
      </div>

      {error && <p className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-800">No se pudieron leer los leads.</p>}
      {!error && lista.length === 0 && (
        <p className="mt-8 text-sm text-ink-muted">
          {f.estado || f.filtro || f.asesor ? "Ningún lead con estos filtros." : esGerencia ? "Todavía no hay leads." : "Todavía no tienes leads asignados."}
        </p>
      )}

      {lista.length > 0 && (
        <ul className="mt-8 divide-y divide-neutral-200 border border-neutral-200 bg-white">
          {lista.map((l) => {
            const vencido = l.proximo_contacto != null && l.proximo_contacto < hoy;
            return (
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
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                      <span className={pasoElFiltro(l.pago_estado) ? "font-medium text-green-800" : "text-ink-muted"}>
                        {pasoElFiltro(l.pago_estado) ? "Pasó el filtro" : "Sin pagar el diseño"}
                      </span>
                      {l.proximo_contacto && (
                        <span className={vencido ? "font-medium text-red-700" : "text-ink"}>
                          Próximo contacto: {fechaDia(l.proximo_contacto)}
                          {vencido ? " (vencido)" : ""}
                        </span>
                      )}
                      {esGerencia && (
                        <span className="text-ink-muted">
                          {l.asesor_id ? `Asesor: ${nombre.get(l.asesor_id) ?? "—"}` : "Sin asignar"}
                        </span>
                      )}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
