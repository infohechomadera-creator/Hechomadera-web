"use client";

import { useState } from "react";
import { DISENOS_COCINA, FORMAS_COCINA, ESCENAS } from "@/content/cocinas";
import type { CiudadActiva, Forma } from "@/lib/precios/tipos";
import { EscenaCocina } from "./EscenaCocina";

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Precio "desde" por ciudad y escena, calculado en el servidor. */
export type DesdePorCiudad = Record<CiudadActiva, Record<string, number>>;

export function CatalogoCocinas({ desde, ciudades }: { desde: DesdePorCiudad; ciudades: CiudadActiva[] }) {
  const [ciudad, setCiudad] = useState<CiudadActiva>(ciudades[0]);
  const [forma, setForma] = useState<Forma | "todas">("todas");
  const visibles = ESCENAS.filter((e) => forma === "todas" || e.forma.id === forma);

  const chip = (activo: boolean) =>
    `px-4 py-2 text-sm border transition-colors ${
      activo ? "bg-ink text-paper border-ink" : "bg-transparent text-ink border-neutral-300 hover:border-ink"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
          <legend className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Forma</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={chip(forma === "todas")} aria-pressed={forma === "todas"} onClick={() => setForma("todas")}>
              Todas
            </button>
            {FORMAS_COCINA.map((f) => (
              <button key={f.id} type="button" className={chip(forma === f.id)} aria-pressed={forma === f.id} onClick={() => setForma(f.id)}>
                {f.nombre}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {forma !== "todas" && (
        <p className="mt-4 max-w-2xl text-sm text-ink-muted">
          {FORMAS_COCINA.find((f) => f.id === forma)?.descripcion}
        </p>
      )}

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((e) => {
          const titulo = `Cocina ${e.forma.nombre.toLowerCase()} · ${e.diseno.nombre}`;
          return (
            <li key={e.id} className="border border-neutral-200 bg-white">
              <div className="aspect-[2/1] w-full overflow-hidden">
                <EscenaCocina forma={e.forma.id} diseno={e.diseno} titulo={titulo} />
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-widest text-ink-muted">{e.forma.nombre}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-ink">{e.diseno.nombre}</h3>
                <p className="mt-1 text-sm text-ink-muted">{e.diseno.descripcion}</p>
                <p className="mt-3 text-sm text-ink">
                  Desde <span className="font-semibold">{pesos.format(desde[ciudad][e.id])}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-ink-muted">
        {DISENOS_COCINA.length} diseños × {FORMAS_COCINA.length} formas. Imágenes de referencia y precios de ejemplo:
        el valor final depende de las medidas confirmadas en {ciudad}.
      </p>
    </div>
  );
}
