"use client";

import { useState, type ReactNode } from "react";
import { DISENOS_COCINA, FORMAS_COCINA } from "@/content/cocinas";
import { EscenaCocina } from "@/components/cocinas/EscenaCocina";
import type { CiudadActiva, DisenoBase, Forma } from "@/lib/precios/tipos";

/** Opciones de cada ciudad (de su tabla de precios), sin montos: los montos los calcula el servidor. */
export type OpcionesCiudad = Record<CiudadActiva, { colores: { id: string; nombre: string }[]; herrajes: { id: string; nombre: string }[] }>;

const PASOS = ["Forma", "Diseño"] as const;

const chip = (activo: boolean) =>
  `px-4 py-2 text-sm border transition-colors ${
    activo ? "bg-ink text-paper border-ink" : "bg-transparent text-ink border-neutral-300 hover:border-ink"
  }`;

const tarjeta = (activo: boolean) =>
  `block w-full border bg-white text-left transition-colors ${activo ? "border-ink ring-1 ring-ink" : "border-neutral-200 hover:border-ink"}`;

function Titulo({ children, ayuda }: { children: ReactNode; ayuda?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-ink">{children}</h2>
      {ayuda && <p className="mt-2 text-sm text-ink-muted">{ayuda}</p>}
    </div>
  );
}

export function Configurador({ ciudades }: { ciudades: CiudadActiva[]; opciones: OpcionesCiudad }) {
  const [paso, setPaso] = useState(0);
  const [ciudad, setCiudad] = useState<CiudadActiva>(ciudades[0]);
  const [forma, setForma] = useState<Forma | null>(null);
  const [diseno, setDiseno] = useState<DisenoBase | null>(null);

  const listo = [Boolean(forma), Boolean(diseno)][paso];
  const disenoNeutro = DISENOS_COCINA[0];

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

      {paso === 0 && (
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
                <button key={f.id} type="button" className={`${tarjeta(forma === f.id)} flex flex-col`} aria-pressed={forma === f.id} onClick={() => setForma(f.id)}>
                  <div className="aspect-[2/1] w-full overflow-hidden">
                    <EscenaCocina forma={f.id} diseno={disenoNeutro} titulo={`Cocina ${f.nombre.toLowerCase()}`} />
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

      {paso === 1 && forma && (
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
                  onClick={() => setDiseno(d.id)}
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            className="px-2 py-2 text-sm text-ink underline-offset-4 hover:underline disabled:invisible"
            disabled={paso === 0}
            onClick={() => setPaso((p) => p - 1)}
          >
            Atrás
          </button>
          <button
            type="button"
            className="border border-ink bg-ink px-6 py-3 text-sm font-medium tracking-wide text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!listo || paso === PASOS.length - 1}
            onClick={() => {
              setPaso((p) => p + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
