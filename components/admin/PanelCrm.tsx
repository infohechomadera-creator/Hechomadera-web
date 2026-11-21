"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarNota, asignarAsesor, cambiarEstado, ponerProximoContacto, type Resultado } from "@/app/admin/leads/acciones";
import { ESTADOS_A_MANO, ETIQUETA_ESTADO, ETIQUETA_PAGO, MAX_NOTA, esEstadoAMano, pasoElFiltro } from "@/lib/leads";

export type EntradaHistorial = { id: string; tipo: string; detalle: string; autor: string; cuando: string };

type Props = {
  leadId: string;
  esGerencia: boolean;
  estado: string;
  pagoEstado: string;
  proximoContacto: string | null;
  hoy: string;
  asesorId: string | null;
  asesorNombre: string | null;
  /** Solo para gerencia: personas activas a quienes se puede asignar. */
  equipo: { id: string; nombre: string }[];
  historial: EntradaHistorial[];
};

const ETIQUETA_TIPO: Record<string, string> = {
  nota: "Nota",
  cambio_estado: "Estado",
  asignacion: "Asignación",
  pago: "Pago",
  operflow: "Operflow",
};

const campo = "w-full border border-neutral-300 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink disabled:opacity-50";
const rotulo = "block text-xs font-semibold uppercase tracking-wider text-ink-muted";
const boton =
  "border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";
const botonSuave = "border border-neutral-300 px-4 py-2.5 text-sm text-ink hover:border-ink disabled:opacity-50";

export function PanelCrm(p: Props) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [fecha, setFecha] = useState(p.proximoContacto ?? "");
  const [nota, setNota] = useState("");
  // Lo elegido se ve mientras guarda; si falla, vuelve a lo que dice la base.
  const [estadoSel, setEstadoSel] = useState<string | null>(null);
  const [asesorSel, setAsesorSel] = useState<string | null | undefined>(undefined);

  function hacer(accion: () => Promise<Resultado>, exito: string, despues?: () => void) {
    setMensaje(null);
    iniciar(async () => {
      const r = await accion();
      if (r.ok) {
        setMensaje({ ok: true, texto: exito });
        despues?.();
        router.refresh();
      } else {
        setMensaje({ ok: false, texto: r.error });
      }
      // Dentro de la misma transición: al terminar, manda lo que dice la base (ya refrescada).
      setEstadoSel(null);
      setAsesorSel(undefined);
    });
  }

  const filtro = pasoElFiltro(p.pagoEstado);

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-ink">Seguimiento</h2>

      <div className="mt-4 grid gap-4 border border-neutral-200 bg-white p-4 md:grid-cols-2">
        <div>
          <p className={rotulo}>Filtro</p>
          <p
            className={`mt-2 inline-block border px-3 py-1.5 text-sm ${
              filtro ? "border-green-700 bg-green-50 text-green-800" : "border-neutral-300 bg-paper text-ink-muted"
            }`}
          >
            {filtro ? "Pasó el filtro · " : ""}
            {ETIQUETA_PAGO[p.pagoEstado] ?? p.pagoEstado}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Se marca solo cuando Mercado Pago confirma el pago (o gerencia lo registra a mano).</p>
        </div>

        <div>
          <label htmlFor="estado" className={rotulo}>
            Estado
          </label>
          {esEstadoAMano(p.estado) ? (
            <select
              id="estado"
              className={`mt-2 ${campo}`}
              value={estadoSel ?? p.estado}
              disabled={guardando}
              onChange={(e) => {
                const nuevo = e.target.value;
                setEstadoSel(nuevo);
                hacer(() => cambiarEstado(p.leadId, nuevo), `Estado: ${ETIQUETA_ESTADO[nuevo]}.`);
              }}
            >
              {ESTADOS_A_MANO.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-2 text-sm text-ink">
              {ETIQUETA_ESTADO[p.estado] ?? p.estado}{" "}
              <span className="text-xs text-ink-muted">(lo cambia el sistema)</span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="proximo" className={rotulo}>
            Próximo contacto
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="proximo"
              type="date"
              className={campo}
              min={p.hoy}
              value={fecha}
              disabled={guardando}
              onChange={(e) => setFecha(e.target.value)}
            />
            <button
              type="button"
              className={botonSuave}
              disabled={guardando || fecha === (p.proximoContacto ?? "")}
              onClick={() => hacer(() => ponerProximoContacto(p.leadId, fecha || null), fecha ? "Próximo contacto guardado." : "Próximo contacto quitado.")}
            >
              Guardar
            </button>
          </div>
        </div>

        <div>
          {p.esGerencia ? (
            <>
              <label htmlFor="asesor" className={rotulo}>
                Asignado a
              </label>
              <select
                id="asesor"
                className={`mt-2 ${campo}`}
                value={(asesorSel === undefined ? p.asesorId : asesorSel) ?? ""}
                disabled={guardando}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setAsesorSel(id);
                  hacer(() => asignarAsesor(p.leadId, id), id ? "Lead asignado." : "El lead quedó sin asesor.");
                }}
              >
                <option value="">Sin asesor</option>
                {p.asesorId && !p.equipo.some((x) => x.id === p.asesorId) && (
                  <option value={p.asesorId} disabled>
                    {p.asesorNombre ?? "Persona inactiva"} (inactiva)
                  </option>
                )}
                {p.equipo.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <p className={rotulo}>Asignado a</p>
              <p className="mt-2 text-sm text-ink">{p.asesorNombre ?? "—"}</p>
            </>
          )}
        </div>
      </div>

      {mensaje && (
        <p
          role="status"
          className={`mt-3 border p-3 text-sm ${mensaje.ok ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
        >
          {mensaje.texto}
        </p>
      )}

      <form
        className="mt-6 border border-neutral-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          hacer(() => agregarNota(p.leadId, nota), "Nota guardada.", () => setNota(""));
        }}
      >
        <label htmlFor="nota" className={rotulo}>
          Nota nueva
        </label>
        <textarea
          id="nota"
          rows={3}
          maxLength={MAX_NOTA}
          className={`mt-2 ${campo}`}
          value={nota}
          disabled={guardando}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Qué hablaste con el cliente y qué sigue."
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            {nota.length}/{MAX_NOTA}
          </span>
          <button type="submit" className={boton} disabled={guardando || !nota.trim()}>
            Guardar nota
          </button>
        </div>
      </form>

      <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-muted">Historial</h3>
      {p.historial.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Todavía no hay notas ni cambios.</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-200 border border-neutral-200 bg-white">
          {p.historial.map((h) => (
            <li key={h.id} className="p-4">
              <p className="text-xs text-ink-muted">
                {ETIQUETA_TIPO[h.tipo] ?? h.tipo} · {h.autor} · {h.cuando}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{h.detalle}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
