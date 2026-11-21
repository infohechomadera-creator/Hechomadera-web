"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publicarPrecios } from "@/app/admin/precios/acciones";
import { DISENOS_COCINA } from "@/content/cocinas";
import { calcularRango } from "@/lib/precios/calcular";
import { validarTablaPrecios } from "@/lib/precios/validar";
import {
  CIUDADES_ACTIVAS,
  DISENOS,
  NIVELES_HERRAJES,
  PRODUCTOS,
  type CiudadActiva,
  type TablaPrecios,
} from "@/lib/precios/tipos";

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const NOMBRE_PRODUCTO: Record<(typeof PRODUCTOS)[number], string> = {
  cocina: "Cocina",
  closet: "Closet",
  mueble_bano: "Mueble de baño",
  centro_entretenimiento: "Centro de entretenimiento",
  puerta: "Puerta",
  escritorio: "Escritorio",
};

const campo =
  "w-full border border-neutral-300 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink tabular-nums";
const etiqueta = "block text-xs font-semibold uppercase tracking-wider text-ink-muted";

function Numero({
  valor,
  onCambio,
  sufijo,
  paso = 1,
}: {
  valor: number;
  onCambio: (v: number) => void;
  sufijo?: string;
  paso?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={paso}
        value={Number.isFinite(valor) ? valor : ""}
        onChange={(e) => onCambio(e.target.value === "" ? Number.NaN : Number(e.target.value))}
        className={campo}
      />
      {sufijo && <span className="text-xs text-ink-muted">{sufijo}</span>}
    </div>
  );
}

export function EditorPrecios({ tablas, hoy }: { tablas: Record<CiudadActiva, TablaPrecios>; hoy: string }) {
  const router = useRouter();
  const [ciudad, setCiudad] = useState<CiudadActiva>(CIUDADES_ACTIVAS[0]);
  const [borradores, setBorradores] = useState(tablas);
  const [vigencia, setVigencia] = useState(hoy);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; textos: string[] } | null>(null);
  const [guardando, iniciar] = useTransition();

  const t = borradores[ciudad];
  const cambiar = (fn: (x: TablaPrecios) => TablaPrecios) => {
    setMensaje(null);
    setBorradores((b) => ({ ...b, [ciudad]: fn(structuredClone(b[ciudad])) }));
  };
  const problemas = useMemo(() => validarTablaPrecios({ ...t, vigente_desde: vigencia }), [t, vigencia]);
  const ejemplo = useMemo(() => {
    if (problemas.length) return null;
    try {
      return calcularRango(t, {
        forma: "L",
        diseno: "D1",
        color: Object.keys(t.colores)[0],
        herrajes: "estandar",
        medidas_mm: { pared_a: 3000, pared_b: 2400 },
      });
    } catch {
      return null;
    }
  }, [t, problemas]);

  function guardar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await publicarPrecios(ciudad, vigencia, t);
      if (r.ok) {
        setMensaje({ tipo: "ok", textos: [`Precios de ${ciudad} guardados. Vigentes desde ${r.vigente_desde}.`] });
        router.refresh();
      } else {
        setMensaje({ tipo: "error", textos: r.problemas });
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ciudad">
        {CIUDADES_ACTIVAS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === ciudad}
            onClick={() => {
              setCiudad(c);
              setMensaje(null);
            }}
            className={`border px-4 py-2 text-sm ${c === ciudad ? "border-ink bg-ink text-paper" : "border-neutral-300 text-ink hover:border-ink"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <fieldset className="border border-neutral-200 bg-white p-6">
          <legend className="px-1 font-display text-lg font-semibold text-ink">Metro lineal por diseño</legend>
          <p className="text-xs text-ink-muted">Muebles bajos + altos, por metro, en pesos.</p>
          <div className="mt-4 space-y-3">
            {DISENOS.map((d) => (
              <label key={d} className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
                <span className="text-sm text-ink">
                  {d} · {DISENOS_COCINA.find((x) => x.id === d)?.nombre}
                </span>
                <Numero
                  valor={t.metro_lineal[d]}
                  paso={10000}
                  onCambio={(v) => cambiar((x) => ((x.metro_lineal[d] = v), x))}
                />
              </label>
            ))}
            <label className="grid grid-cols-[1fr_1.2fr] items-center gap-3 border-t border-neutral-200 pt-3">
              <span className="text-sm text-ink">Isla (por metro)</span>
              <Numero
                valor={t.isla_metro_lineal}
                paso={10000}
                onCambio={(v) => cambiar((x) => ((x.isla_metro_lineal = v), x))}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="border border-neutral-200 bg-white p-6">
          <legend className="px-1 font-display text-lg font-semibold text-ink">Adicionales</legend>
          <p className={`${etiqueta} mt-2`}>Colores y acabados</p>
          <div className="mt-2 space-y-2">
            {Object.entries(t.colores).map(([k, c]) => (
              <div key={k} className="grid grid-cols-[1.4fr_1fr] gap-3">
                <input
                  aria-label={`Nombre del color ${k}`}
                  value={c.nombre}
                  onChange={(e) => cambiar((x) => ((x.colores[k].nombre = e.target.value), x))}
                  className={campo}
                />
                <Numero
                  valor={c.recargo_pct}
                  sufijo="%"
                  onCambio={(v) => cambiar((x) => ((x.colores[k].recargo_pct = v), x))}
                />
              </div>
            ))}
          </div>
          <p className={`${etiqueta} mt-5`}>Nivel de herrajes</p>
          <div className="mt-2 space-y-2">
            {NIVELES_HERRAJES.map((h) => (
              <div key={h} className="grid grid-cols-[1.4fr_1fr] gap-3">
                <input
                  aria-label={`Nombre de herrajes ${h}`}
                  value={t.herrajes[h].nombre}
                  onChange={(e) => cambiar((x) => ((x.herrajes[h].nombre = e.target.value), x))}
                  className={campo}
                />
                <Numero
                  valor={t.herrajes[h].recargo_pct}
                  sufijo="%"
                  onCambio={(v) => cambiar((x) => ((x.herrajes[h].recargo_pct = v), x))}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="border border-neutral-200 bg-white p-6">
          <legend className="px-1 font-display text-lg font-semibold text-ink">Valor del diseño por producto</legend>
          <p className="text-xs text-ink-muted">Se descuenta del anticipo si el cliente aprueba.</p>
          <div className="mt-4 space-y-3">
            {PRODUCTOS.map((p) => (
              <label key={p} className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
                <span className="text-sm text-ink">{NOMBRE_PRODUCTO[p]}</span>
                <Numero
                  valor={t.valor_diseno[p]}
                  paso={10000}
                  onCambio={(v) => cambiar((x) => ((x.valor_diseno[p] = v), x))}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border border-neutral-200 bg-white p-6">
          <legend className="px-1 font-display text-lg font-semibold text-ink">Reglas del rango</legend>
          <div className="mt-2 space-y-3">
            <label className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
              <span className="text-sm text-ink">Margen por medidas aproximadas (±)</span>
              <Numero valor={t.incertidumbre_pct} sufijo="%" onCambio={(v) => cambiar((x) => ((x.incertidumbre_pct = v), x))} />
            </label>
            <label className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
              <span className="text-sm text-ink">Redondear a múltiplos de</span>
              <Numero valor={t.redondeo} paso={10000} onCambio={(v) => cambiar((x) => ((x.redondeo = v), x))} />
            </label>
            <label className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
              <span className="text-sm text-ink">Anticipo sobre el valor final</span>
              <Numero valor={t.anticipo_pct} sufijo="%" onCambio={(v) => cambiar((x) => ((x.anticipo_pct = v), x))} />
            </label>
          </div>
          <div className="mt-6 border-t border-neutral-200 pt-4 text-sm">
            <p className={etiqueta}>Ejemplo con estos precios</p>
            <p className="mt-2 text-ink-muted">
              Cocina en L de 3 m + 2,4 m, {DISENOS_COCINA[0].nombre}, primer color, herrajes estándar:
            </p>
            <p className="mt-1 font-semibold text-ink">
              {ejemplo ? `${pesos.format(ejemplo.min)} – ${pesos.format(ejemplo.max)}` : "Completa los campos para ver el ejemplo"}
            </p>
          </div>
        </fieldset>
      </div>

      <div className="mt-8 flex flex-col gap-4 border border-neutral-200 bg-white p-6 md:flex-row md:items-end md:justify-between">
        <label className="block md:w-64">
          <span className={etiqueta}>Vigente desde</span>
          <input
            type="date"
            min={hoy}
            value={vigencia}
            onChange={(e) => {
              setVigencia(e.target.value);
              setMensaje(null);
            }}
            className={`${campo} mt-2`}
          />
        </label>
        <div className="flex-1 md:px-6">
          {problemas.length > 0 && !mensaje && (
            <ul className="space-y-1 text-xs text-red-700">
              {problemas.slice(0, 4).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {mensaje && (
            <ul className={`space-y-1 text-sm ${mensaje.tipo === "ok" ? "text-green-700" : "text-red-700"}`}>
              {mensaje.textos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || problemas.length > 0}
          className="border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando..." : `Guardar precios de ${ciudad}`}
        </button>
      </div>
    </div>
  );
}
