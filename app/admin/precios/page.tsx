import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { EditorPrecios } from "@/components/admin/EditorPrecios";
import { elegirTablas } from "@/lib/precios/fuente";
import { hoyEnColombia } from "@/lib/precios/fechas";
import { clienteUsuario } from "@/lib/supabase/servidor";
import { CIUDADES_ACTIVAS } from "@/lib/precios/tipos";

export const metadata: Metadata = {
  title: "Admin · Precios",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type FilaHistorial = {
  ciudad: string;
  vigente_desde: string;
  creado_at: string;
  perfiles: { nombre: string } | null;
};

export default async function AdminPreciosPage() {
  // El middleware ya exige gerencia; la lectura respeta RLS.
  const supabase = await clienteUsuario();
  const [{ data: vigentes }, { data: historial }] = await Promise.all([
    supabase.from("precios_vigentes").select("ciudad, datos"),
    supabase
      .from("precios")
      .select("ciudad, vigente_desde, creado_at, perfiles(nombre)")
      .order("creado_at", { ascending: false })
      .limit(15)
      .returns<FilaHistorial[]>(),
  ]);
  const { tablas, origen } = elegirTablas(vigentes ?? []);
  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>{" "}
            · Precios
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Tabla de precios por ciudad</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Cada vez que guardas se crea una versión nueva; las anteriores quedan en el historial. La web y Operflow usan
            siempre la versión vigente. Los precios actuales son de ejemplo.
          </p>
        </div>
        <LogoutButton />
      </div>

      {CIUDADES_ACTIVAS.some((c) => origen[c] === "semilla") && (
        <p className="mt-6 border border-neutral-200 bg-paper-dim p-3 text-xs text-ink">
          Alguna ciudad está mostrando los precios de ejemplo porque no tiene versión guardada en la base. Al guardar se
          crea su primera versión.
        </p>
      )}

      <div className="mt-8">
        <EditorPrecios tablas={tablas} hoy={hoyEnColombia()} />
      </div>

      <section className="mt-12 border-t border-neutral-200 pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Historial de versiones</h2>
        {historial && historial.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="py-2 pr-4">Ciudad</th>
                  <th className="py-2 pr-4">Vigente desde</th>
                  <th className="py-2 pr-4">Guardada</th>
                  <th className="py-2">Por</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={`${h.ciudad}-${h.creado_at}`} className="border-t border-neutral-200">
                    <td className="py-2 pr-4 text-ink">{h.ciudad}</td>
                    <td className="py-2 pr-4">{h.vigente_desde}</td>
                    <td className="py-2 pr-4">{fecha.format(new Date(h.creado_at))}</td>
                    <td className="py-2 text-ink-muted">{h.perfiles?.nombre ?? "Carga inicial"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Aún no hay versiones guardadas.</p>
        )}
      </section>
    </div>
  );
}
