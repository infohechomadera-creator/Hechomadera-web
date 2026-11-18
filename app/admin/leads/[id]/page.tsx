import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { rolActual } from "@/lib/sesion";
import { clienteSistema, clienteUsuario } from "@/lib/supabase/servidor";
import { CUBETA_FOTOS } from "@/lib/configurador/guardar";
import { hoyEnColombia } from "@/lib/precios/fechas";
import { PanelCrm, type EntradaHistorial } from "@/components/admin/PanelCrm";
import {
  ETIQUETA_ESTADO,
  UUID,
  fechaCorta,
  nombreDiseno,
  nombreElectro,
  nombreForma,
  pesos,
  type ConfiguracionGuardada,
} from "@/lib/leads";

export const metadata: Metadata = { title: "Admin · Lead", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Los enlaces a las fotos vencen a los 10 minutos. */
const VIDA_ENLACE_SEG = 600;

type Lead = {
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
  clientes: { nombre: string; telefono: string; email: string | null; autorizacion_datos_at: string; autorizacion_version: string } | null;
  archivos: { ruta: string }[];
};

export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  // Segunda barrera además del middleware: los enlaces firmados se crean con la llave del sistema.
  const rol = await rolActual();
  if (rol !== "gerencia" && rol !== "asesor") notFound();
  const esGerencia = rol === "gerencia";

  // Se lee como la persona con sesión (RLS): un asesor solo encuentra sus leads,
  // y solo se firman las fotos que esa persona puede ver.
  const supabase = await clienteUsuario();
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, ciudad, estado, pago_estado, asesor_id, proximo_contacto, rango_min, rango_max, configuracion, creado_at, clientes(nombre, telefono, email, autorizacion_datos_at, autorizacion_version), archivos(ruta)",
    )
    .eq("id", id)
    .maybeSingle<Lead>();
  if (!lead) notFound();

  const [{ data: actividades }, { data: nombres }, { data: activos }] = await Promise.all([
    supabase
      .from("actividades")
      .select("id, tipo, detalle, autor_id, creado_at")
      .eq("lead_id", lead.id)
      .order("creado_at", { ascending: false })
      .limit(200)
      .returns<{ id: string; tipo: string; detalle: string; autor_id: string | null; creado_at: string }[]>(),
    supabase.rpc("nombres_equipo"),
    // Solo gerencia lee la tabla de perfiles (RLS): personas activas para asignar.
    esGerencia
      ? supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre").returns<{ id: string; nombre: string }[]>()
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);
  const nombre = new Map(((nombres ?? []) as { id: string; nombre: string }[]).map((n) => [n.id, n.nombre]));
  const historial: EntradaHistorial[] = (actividades ?? []).map((a) => ({
    id: a.id,
    tipo: a.tipo,
    detalle: a.detalle,
    autor: a.autor_id ? (nombre.get(a.autor_id) ?? "Equipo") : "Sistema",
    cuando: fechaCorta(a.creado_at),
  }));

  const rutas = (lead.archivos ?? []).map((a) => a.ruta);
  let fotos: string[] = [];
  let fallaFotos = false;
  if (rutas.length) {
    const { data, error } = await clienteSistema().storage.from(CUBETA_FOTOS).createSignedUrls(rutas, VIDA_ENLACE_SEG);
    fotos = (data ?? []).flatMap((f) => (f.signedUrl ? [f.signedUrl] : []));
    fallaFotos = Boolean(error) || fotos.length < rutas.length;
  }

  const c = lead.configuracion ?? {};
  const cli = lead.clientes;
  const filas: [string, string][] = [
    ["Ciudad", lead.ciudad],
    ["Forma", nombreForma(c.forma)],
    ["Diseño base", nombreDiseno(c.diseno)],
    ["Acabado", c.color ?? "—"],
    ["Herrajes", c.herrajes ?? "—"],
    ["Electrodomésticos", (c.electrodomesticos ?? []).map(nombreElectro).join(", ") || "Ninguno"],
    [
      "Medidas aproximadas",
      Object.entries(c.medidas_mm ?? {})
        .map(([k, v]) => `${k.replace("_", " ")}: ${(v / 1000).toLocaleString("es-CO")} m`)
        .join(" · ") || "—",
    ],
    ["Rango", `${pesos(lead.rango_min)} – ${pesos(lead.rango_max)}`],
    ["Precios usados", c.precios_vigente_desde ? `vigentes desde ${c.precios_vigente_desde}` : "—"],
    ["Estado", `${ETIQUETA_ESTADO[lead.estado] ?? lead.estado} · pagó: ${lead.pago_estado}`],
    ["Llegó", fechaCorta(lead.creado_at)],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {esGerencia && (
              <>
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>{" "}
                ·{" "}
              </>
            )}
            <Link href="/admin/leads" className="hover:underline">
              {esGerencia ? "Leads" : "Mis leads"}
            </Link>{" "}
            · {lead.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{cli?.nombre ?? "Lead"}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {cli?.telefono}
            {cli?.email ? ` · ${cli.email}` : ""}
          </p>
        </div>
        <LogoutButton />
      </div>

      <dl className="mt-8 divide-y divide-neutral-200 border border-neutral-200 bg-white">
        {filas.map(([k, v]) => (
          <div key={k} className="grid gap-1 p-4 md:grid-cols-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{k}</dt>
            <dd className="text-sm text-ink md:col-span-2">{v}</dd>
          </div>
        ))}
        <div className="grid gap-1 p-4 md:grid-cols-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Autorización de datos</dt>
          <dd className="text-sm text-ink md:col-span-2">
            {cli ? `Aceptó el ${fechaCorta(cli.autorizacion_datos_at)} (texto ${cli.autorizacion_version})` : "—"}
          </dd>
        </div>
      </dl>

      <PanelCrm
        leadId={lead.id}
        esGerencia={esGerencia}
        estado={lead.estado}
        pagoEstado={lead.pago_estado}
        proximoContacto={lead.proximo_contacto}
        hoy={hoyEnColombia()}
        asesorId={lead.asesor_id}
        asesorNombre={lead.asesor_id ? (nombre.get(lead.asesor_id) ?? null) : null}
        equipo={activos ?? []}
        historial={historial}
      />

      <h2 className="mt-10 font-display text-xl font-semibold text-ink">Fotos del espacio</h2>
      {fallaFotos && (
        <p className="mt-2 border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {rutas.length - fotos.length} de {rutas.length} foto(s) no se pudieron cargar. Recarga la página.
        </p>
      )}
      {rutas.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">El cliente no envió fotos.</p>
      ) : fotos.length === 0 ? null : (
        <>
          <p className="mt-1 text-xs text-ink-muted">Los enlaces vencen en 10 minutos; recarga la página para verlas de nuevo.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {fotos.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1} del espacio`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
