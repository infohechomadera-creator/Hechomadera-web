import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { rolActual } from "@/lib/sesion";
import { clienteUsuario } from "@/lib/supabase/servidor";
import { hoyEnColombia } from "@/lib/precios/fechas";
import {
  ESTADOS_A_MANO,
  ETIQUETA_ESTADO,
  leerFiltros,
  type Filtros,
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

function enlace(actual: Filtros, cambio: Filtros): string {
  const f = { ...actual, ...cambio };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/admin/leads?${s}` : "/admin/leads";
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`border px-3 py-1.5 text-sm ${activo ? "border-ink bg-ink text-paper" : "border-neutral-300 text-ink hover:border-ink"}`}
    >
      {children}
    </Link>
  );
}

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {esGerencia ? (
              <>
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>{" "}
                · Leads
              </>
            ) : (
              "Mis leads"
            )}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{esGerencia ? "Leads del configurador" : "Mis leads"}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {esGerencia ? "Los 100 más recientes. Asigna cada lead desde su ficha." : "Ordenados por próximo contacto."}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Chip href={enlace(f, { estado: undefined })} activo={!f.estado}>
            Todos
          </Chip>
          {ESTADOS_A_MANO.map((e) => (
            <Chip key={e} href={enlace(f, { estado: e })} activo={f.estado === e}>
              {ETIQUETA_ESTADO[e]}
            </Chip>
          ))}
          <Chip href={enlace(f, { estado: "diseno_pagado" })} activo={f.estado === "diseno_pagado"}>
            {ETIQUETA_ESTADO.diseno_pagado}
          </Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip href={enlace(f, { filtro: undefined })} activo={!f.filtro}>
            Con y sin pago
          </Chip>
          <Chip href={enlace(f, { filtro: "si" })} activo={f.filtro === "si"}>
            Pasó el filtro
          </Chip>
          <Chip href={enlace(f, { filtro: "no" })} activo={f.filtro === "no"}>
            Sin pagar el diseño
          </Chip>
        </div>
        {esGerencia && (
          <div className="flex flex-wrap gap-2">
            <Chip href={enlace(f, { asesor: undefined })} activo={!f.asesor}>
              Todo el equipo
            </Chip>
            <Chip href={enlace(f, { asesor: "sin" })} activo={f.asesor === "sin"}>
              Sin asignar
            </Chip>
            {equipo.map((p) => (
              <Chip key={p.id} href={enlace(f, { asesor: p.id })} activo={f.asesor === p.id}>
                {p.nombre}
              </Chip>
            ))}
          </div>
        )}
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
