"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DISENOS_COCINA, FORMAS_COCINA } from "@/content/cocinas";
import { EscenaCocina } from "@/components/cocinas/EscenaCocina";
import type { CiudadActiva, DisenoBase, Forma, MedidasAprox, NivelHerrajes } from "@/lib/precios/tipos";
import { ELECTRODOMESTICOS, type Electrodomestico } from "@/lib/configurador/validar";
import { AUTORIZACION_TEXTO, AUTORIZACION_VERSION } from "@/lib/configurador/autorizacion";
import { MAX_BYTES_TOTAL } from "@/lib/configurador/fotos";
import { reducirFoto } from "./reducirFoto";

/** Opciones de cada ciudad (de su tabla de precios), sin montos: los montos los calcula el servidor. */
export type OpcionesCiudad = Record<CiudadActiva, { colores: { id: string; nombre: string }[]; herrajes: { id: string; nombre: string }[] }>;

const PASOS = ["Forma", "Diseño", "Colores", "Herrajes", "Electrodomésticos", "Medidas", "Tu rango", "Fotos", "Tus datos"] as const;
const P = Object.fromEntries(PASOS.map((p, i) => [p, i])) as Record<(typeof PASOS)[number], number>;
const MAX_FOTOS = 5;

/** Identificador del envío (evita leads repetidos). Alternativa para celulares viejos sin randomUUID. */
function nuevoEnvioId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Lee la respuesta del servidor aunque no sea JSON (por ejemplo, un 413 de Vercel). */
async function leerRespuesta(r: Response): Promise<{ ok: boolean; cuerpo: Record<string, unknown> }> {
  if (r.status === 413) return { ok: false, cuerpo: { error: "Las fotos pesan demasiado. Quita una o dos e intenta de nuevo." } };
  try {
    return { ok: r.ok, cuerpo: await r.json() };
  } catch {
    return { ok: false, cuerpo: { error: "Algo falló de nuestro lado. Intenta de nuevo en un momento." } };
  }
}

const PAREDES: Record<Forma, { campo: keyof MedidasAprox; etiqueta: string }[]> = {
  lineal: [{ campo: "pared_a", etiqueta: "Largo de la pared" }],
  L: [
    { campo: "pared_a", etiqueta: "Pared A (la más larga)" },
    { campo: "pared_b", etiqueta: "Pared B" },
  ],
  U: [
    { campo: "pared_a", etiqueta: "Pared A (la del fondo)" },
    { campo: "pared_b", etiqueta: "Pared B (izquierda)" },
    { campo: "pared_c", etiqueta: "Pared C (derecha)" },
  ],
  isla: [
    { campo: "pared_a", etiqueta: "Largo de la pared" },
    { campo: "isla", etiqueta: "Largo de la isla" },
  ],
};

const AYUDA_HERRAJES: Record<string, string> = {
  estandar: "Bisagras y rieles de buena duración para el uso diario.",
  premium: "Puertas y cajones que cierran suave, sin golpes.",
  alta: "Herrajes europeos: máxima suavidad y duración.",
};

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const chip = (activo: boolean) =>
  `px-4 py-2 text-sm border transition-colors ${
    activo ? "bg-ink text-paper border-ink" : "bg-transparent text-ink border-neutral-300 hover:border-ink"
  }`;

const tarjeta = (activo: boolean) =>
  `block w-full border bg-white text-left transition-colors ${activo ? "border-ink ring-1 ring-ink" : "border-neutral-200 hover:border-ink"}`;

const campoTexto = "mt-1 w-full border border-neutral-300 bg-white px-3 py-3 text-base text-ink focus:border-ink focus:outline-none";

function Titulo({ children, ayuda }: { children: ReactNode; ayuda?: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-ink">{children}</h2>
      {ayuda && <p className="mt-2 text-sm text-ink-muted">{ayuda}</p>}
    </div>
  );
}

/** "3,2" o "3.2" metros → 3200 mm. */
const aMm = (texto: string): number | null => {
  const n = Number(texto.trim().replace(",", "."));
  return texto.trim() && Number.isFinite(n) ? Math.round(n * 1000) : null;
};

type Rango = { min: number; max: number; ciudad: string };
type Foto = { blob: Blob; url: string };

export function Configurador({ ciudades, opciones }: { ciudades: CiudadActiva[]; opciones: OpcionesCiudad }) {
  const [paso, setPaso] = useState(0);
  const [ciudad, setCiudadEstado] = useState<CiudadActiva>(ciudades[0]);
  const [forma, setForma] = useState<Forma | null>(null);
  const [diseno, setDiseno] = useState<DisenoBase | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [herrajes, setHerrajes] = useState<NivelHerrajes | null>(null);
  const [electro, setElectro] = useState<Electrodomestico[]>([]);
  const [medidas, setMedidas] = useState<Partial<Record<keyof MedidasAprox, string>>>({});
  const [rango, setRango] = useState<Rango | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [contacto, setContacto] = useState({ nombre: "", telefono: "", email: "" });
  const [autoriza, setAutoriza] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [envioId] = useState(nuevoEnvioId);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<{ referencia: string | null; rango: Rango | null } | null>(null);

  const opc = opciones[ciudad];
  const disenoInfo = DISENOS_COCINA.find((d) => d.id === diseno) ?? DISENOS_COCINA[0];
  const paredes = forma ? PAREDES[forma] : [];
  const medidasMm = Object.fromEntries(paredes.map((p) => [p.campo, aMm(medidas[p.campo] ?? "")])) as Record<string, number | null>;

  const setCiudad = (c: CiudadActiva) => {
    setCiudadEstado(c);
    setRango(null);
    // Los colores dependen de la ciudad: si el elegido no existe allá, se vuelve a elegir.
    if (color && !opciones[c].colores.some((o) => o.id === color)) setColor(null);
  };

  const configuracion = () => ({
    ciudad,
    forma,
    diseno,
    color,
    herrajes,
    electrodomesticos: electro,
    medidas_mm: medidasMm,
  });

  const listo: boolean[] = [
    Boolean(forma),
    Boolean(diseno),
    Boolean(color),
    Boolean(herrajes),
    true,
    paredes.length > 0 && paredes.every((p) => medidasMm[p.campo] !== null),
    Boolean(rango),
    true,
    contacto.nombre.trim().length >= 2 && contacto.telefono.replace(/\D/g, "").length >= 7 && autoriza,
  ];

  const irA = (n: number) => {
    setError(null);
    setPaso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function calcular() {
    setOcupado(true);
    setError(null);
    try {
      const r = await fetch("/api/configurador/rango", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configuracion()),
      });
      const { ok, cuerpo } = await leerRespuesta(r);
      if (!ok) return setError(String(cuerpo.error ?? "No pudimos calcular el rango"));
      setRango(cuerpo.rango as Rango);
      irA(P["Tu rango"]);
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function agregarFotos(lista: FileList | null) {
    if (!lista) return;
    setError(null);
    setOcupado(true);
    try {
      const nuevas: Foto[] = [];
      let total = fotos.reduce((suma, f) => suma + f.blob.size, 0);
      for (const archivo of Array.from(lista).slice(0, MAX_FOTOS - fotos.length)) {
        const blob = await reducirFoto(archivo);
        if (!blob) {
          setError("Una de las fotos no se pudo usar (formato raro o demasiado grande). Prueba con otra.");
          continue;
        }
        if (total + blob.size > MAX_BYTES_TOTAL) {
          setError("Ya no caben más fotos en este envío. Quita una si quieres cambiarla.");
          break;
        }
        total += blob.size;
        nuevas.push({ blob, url: URL.createObjectURL(blob) });
      }
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } finally {
      setOcupado(false);
    }
  }

  async function enviar() {
    setOcupado(true);
    setError(null);
    const form = new FormData();
    form.set(
      "datos",
      JSON.stringify({
        configuracion: configuracion(),
        contacto,
        autorizacion: { acepta: autoriza, version: AUTORIZACION_VERSION },
        envio_id: envioId,
      }),
    );
    fotos.forEach((f, i) => form.append("fotos", f.blob, `foto-${i + 1}.jpg`));
    if (trampa) form.set("sitio_web", trampa);
    try {
      const r = await fetch("/api/configurador/lead", { method: "POST", body: form });
      const { ok, cuerpo } = await leerRespuesta(r);
      if (!ok) return setError(String(cuerpo.error ?? "No pudimos enviar tu solicitud"));
      setEnviado({ referencia: (cuerpo.referencia as string | null) ?? null, rango: (cuerpo.rango as Rango | undefined) ?? rango });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  if (enviado) {
    const r = enviado.rango;
    return (
      <section className="space-y-6" aria-live="polite">
        <Titulo>¡Listo, {contacto.nombre.trim().split(" ")[0]}! Recibimos tu cocina</Titulo>
        {r && (
          <div className="border border-ink bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Tu rango en {r.ciudad}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {pesos.format(r.min)} – {pesos.format(r.max)}
            </p>
          </div>
        )}
        <p className="text-sm text-ink-muted">
          Un asesor te contactará pronto para revisar tus medidas y contarte cómo sigue el diseño.
          {enviado.referencia && (
            <>
              {" "}
              Tu número de referencia es <strong className="text-ink">{enviado.referencia}</strong>.
            </>
          )}
        </p>
        <Link href="/cocinas" className="inline-block text-sm text-ink underline underline-offset-4">
          Volver a cocinas
        </Link>
      </section>
    );
  }

  const esUltimo = paso === P["Tus datos"];

  return (
    <div className="pb-28">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
        </p>
        <div className="mt-2 h-1 w-full bg-neutral-200" aria-hidden>
          <div className="h-1 bg-ink transition-all" style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} />
        </div>
      </div>

      {paso === P.Forma && (
        <section className="mt-8 space-y-8">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Tu ciudad</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ciudades.map((c) => (
                <button key={c} type="button" className={chip(c === ciudad)} aria-pressed={c === ciudad} onClick={() => setCiudad(c)}>
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="sr-only">Forma de la cocina</legend>
            <Titulo ayuda="Piensa en cuántas paredes ocupará tu cocina.">¿Qué forma tiene tu cocina?</Titulo>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {FORMAS_COCINA.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${tarjeta(forma === f.id)} flex flex-col`}
                  aria-pressed={forma === f.id}
                  onClick={() => {
                    setForma(f.id);
                    setRango(null);
                  }}
                >
                  <div className="aspect-[2/1] w-full overflow-hidden">
                    <EscenaCocina forma={f.id} diseno={DISENOS_COCINA[0]} titulo={`Cocina ${f.nombre.toLowerCase()}`} />
                  </div>
                  <div className="p-3">
                    <p className="font-display text-lg font-semibold text-ink">{f.nombre}</p>
                    <p className="mt-1 text-xs text-ink-muted">{f.descripcion}</p>
                  </div>
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {paso === P.Diseño && forma && (
        <section className="mt-8">
          <fieldset>
            <legend className="sr-only">Diseño base</legend>
            <Titulo ayuda="Es el punto de partida; en el diseño lo ajustamos a tu gusto.">Elige un diseño base</Titulo>
            <div className="mt-4 grid gap-3">
              {DISENOS_COCINA.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`${tarjeta(diseno === d.id)} flex items-stretch`}
                  aria-pressed={diseno === d.id}
                  onClick={() => {
                    setDiseno(d.id);
                    setRango(null);
                  }}
                >
                  <div className="w-2/5 shrink-0 overflow-hidden">
                    <EscenaCocina forma={forma} diseno={d} titulo={`Diseño ${d.nombre}`} />
                  </div>
                  <div className="p-3">
                    <p className="font-display text-lg font-semibold text-ink">{d.nombre}</p>
                    <p className="mt-1 text-xs text-ink-muted">{d.descripcion}</p>
                  </div>
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {paso === P.Colores && (
        <section className="mt-8">
          <fieldset>
            <legend className="sr-only">Color y acabado</legend>
            <Titulo ayuda="El color exacto lo eliges en el diseño; aquí defines el tipo de acabado.">¿Qué acabado prefieres?</Titulo>
            <div className="mt-4 grid gap-3">
              {opc.colores.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`${tarjeta(color === o.id)} p-4`}
                  aria-pressed={color === o.id}
                  onClick={() => {
                    setColor(o.id);
                    setRango(null);
                  }}
                >
                  <span className="font-display text-lg font-semibold text-ink">{o.nombre}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {paso === P.Herrajes && (
        <section className="mt-8">
          <fieldset>
            <legend className="sr-only">Nivel de herrajes</legend>
            <Titulo ayuda="Son las bisagras, rieles y mecanismos de puertas y cajones.">¿Qué herrajes quieres?</Titulo>
            <div className="mt-4 grid gap-3">
              {opc.herrajes.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`${tarjeta(herrajes === o.id)} p-4`}
                  aria-pressed={herrajes === o.id}
                  onClick={() => {
                    setHerrajes(o.id as NivelHerrajes);
                    setRango(null);
                  }}
                >
                  <span className="block font-display text-lg font-semibold text-ink">{o.nombre}</span>
                  {AYUDA_HERRAJES[o.id] && <span className="mt-1 block text-xs text-ink-muted">{AYUDA_HERRAJES[o.id]}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {paso === P.Electrodomésticos && (
        <section className="mt-8">
          <fieldset>
            <legend className="sr-only">Electrodomésticos</legend>
            <Titulo ayuda="Así dejamos el espacio justo para cada uno. No cambia tu rango. Puedes saltar este paso.">
              ¿Qué electrodomésticos irán en la cocina?
            </Titulo>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(Object.entries(ELECTRODOMESTICOS) as [Electrodomestico, string][]).map(([id, nombre]) => {
                const marcado = electro.includes(id);
                return (
                  <label key={id} className={`${tarjeta(marcado)} flex cursor-pointer items-center gap-3 p-4`}>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-ink"
                      checked={marcado}
                      onChange={() => setElectro((e) => (marcado ? e.filter((x) => x !== id) : [...e, id]))}
                    />
                    <span className="text-sm text-ink">{nombre}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>
      )}

      {paso === P.Medidas && forma && (
        <section className="mt-8">
          <Titulo
            ayuda={
              <>
                Medidas aproximadas en metros, de pared a pared. Con un metro de cinta basta; las confirmamos antes de fabricar.{" "}
                <a href="/guia-de-medidas.pdf" target="_blank" rel="noopener" className="text-ink underline underline-offset-4">
                  Ver guía de medidas
                </a>
              </>
            }
          >
            ¿Cuánto miden tus paredes?
          </Titulo>
          <div className="mt-4 overflow-hidden border border-neutral-200">
            <div className="aspect-[2/1] w-full">
              <EscenaCocina forma={forma} diseno={disenoInfo} titulo="Tu cocina vista desde arriba" />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {paredes.map((p) => (
              <label key={p.campo} className="block">
                <span className="text-sm font-medium text-ink">{p.etiqueta}</span>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    placeholder="Ej.: 3,2"
                    className={campoTexto}
                    value={medidas[p.campo] ?? ""}
                    onChange={(e) => {
                      setRango(null);
                      setMedidas((m) => ({ ...m, [p.campo]: e.target.value.replace(/[^0-9.,]/g, "") }));
                    }}
                  />
                  <span className="mt-1 text-sm text-ink-muted">m</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {paso === P["Tu rango"] && rango && forma && (
        <section className="mt-8 space-y-6">
          <Titulo ayuda="Con tus medidas aproximadas. El valor final se confirma cuando medimos en tu casa.">
            Tu cocina cuesta entre
          </Titulo>
          <div className="border border-ink bg-white">
            <div className="aspect-[2/1] w-full overflow-hidden">
              <EscenaCocina forma={forma} diseno={disenoInfo} titulo={`Cocina ${forma} · ${disenoInfo.nombre}`} />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                {FORMAS_COCINA.find((f) => f.id === forma)?.nombre} · {disenoInfo.nombre} · {rango.ciudad}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {pesos.format(rango.min)} – {pesos.format(rango.max)}
              </p>
              <p className="mt-2 text-xs text-ink-muted">Imagen de referencia. Incluye muebles bajos y altos instalados.</p>
            </div>
          </div>
          <p className="text-sm text-ink-muted">
            Sigue para enviarnos fotos del espacio y tus datos: un asesor revisa tu caso y te cuenta cómo seguir.
          </p>
        </section>
      )}

      {paso === P.Fotos && (
        <section className="mt-8">
          <Titulo ayuda="Nos ayudan a ver tomas, ventanas y tubos. Son opcionales (hasta 5) y solo las ve nuestro equipo.">
            Fotos de tu espacio
          </Titulo>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {fotos.map((f, i) => (
              <div key={f.url} className="relative aspect-square overflow-hidden border border-neutral-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 bg-ink px-2 py-1 text-xs text-paper"
                  onClick={() => {
                    URL.revokeObjectURL(f.url);
                    setFotos((l) => l.filter((x) => x !== f));
                  }}
                >
                  Quitar
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-neutral-400 bg-white text-center text-sm text-ink hover:border-ink">
                <span className="text-2xl" aria-hidden>
                  +
                </span>
                <span>{ocupado ? "Cargando…" : "Agregar fotos"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={ocupado}
                  onChange={(e) => {
                    void agregarFotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </section>
      )}

      {paso === P["Tus datos"] && (
        <section className="mt-8 space-y-4">
          <Titulo ayuda="Para enviarte tu propuesta y resolver tus dudas.">¿A quién contactamos?</Titulo>
          <label className="block">
            <span className="text-sm font-medium text-ink">Nombre</span>
            <input
              className={campoTexto}
              autoComplete="name"
              maxLength={120}
              value={contacto.nombre}
              onChange={(e) => setContacto((c) => ({ ...c, nombre: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Celular (WhatsApp)</span>
            <input
              className={campoTexto}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={contacto.telefono}
              onChange={(e) => setContacto((c) => ({ ...c, telefono: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Correo (opcional)</span>
            <input
              className={campoTexto}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={200}
              value={contacto.email}
              onChange={(e) => setContacto((c) => ({ ...c, email: e.target.value }))}
            />
          </label>
          {/* Campo trampa para bots: las personas no lo ven. */}
          <input
            type="text"
            name="sitio_web"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
            value={trampa}
            onChange={(e) => setTrampa(e.target.value)}
          />
          <label className="flex cursor-pointer gap-3 border border-neutral-200 bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-ink"
              checked={autoriza}
              onChange={(e) => setAutoriza(e.target.checked)}
            />
            <span className="text-xs text-ink-muted">
              {AUTORIZACION_TEXTO}{" "}
              <Link href="/legal/privacidad" target="_blank" className="text-ink underline underline-offset-4">
                Política de privacidad
              </Link>
            </span>
          </label>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            className="px-2 py-2 text-sm text-ink underline-offset-4 hover:underline disabled:invisible"
            disabled={paso === 0 || ocupado}
            onClick={() => irA(paso - 1)}
          >
            Atrás
          </button>
          <button
            type="button"
            className="border border-ink bg-ink px-6 py-3 text-sm font-medium tracking-wide text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!listo[paso] || ocupado}
            onClick={() => {
              if (paso === P.Medidas) void calcular();
              else if (esUltimo) void enviar();
              else irA(paso + 1);
            }}
          >
            {ocupado
              ? "Un momento…"
              : paso === P.Medidas
                ? "Ver mi rango"
                : esUltimo
                  ? "Enviar"
                  : paso === P.Electrodomésticos && electro.length === 0
                    ? "Saltar"
                    : paso === P.Fotos && fotos.length === 0
                      ? "Seguir sin fotos"
                      : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
