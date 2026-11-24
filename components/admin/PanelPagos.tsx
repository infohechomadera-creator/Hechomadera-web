"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  borrarCliente,
  marcarPagoManual,
  noAprobo,
  ponerValorFinal,
  reenviarOperflow,
  resolverPago,
  type Resultado,
} from "@/app/admin/leads/acciones";
import { pesos } from "@/lib/leads";

export type FilaPago = {
  id: number;
  tipo: string;
  monto: number;
  estado: string;
  cuenta: boolean;
  cuando: string;
  origen: string;
  resuelto: boolean;
  /** Lo que Mercado Pago le devolvió al cliente de este pago. */
  devuelto: number;
};
export type FilaMensaje = { id: number; mensaje: string; estado: string; error: string | null; intentos: number };

type Props = {
  leadId: string;
  esGerencia: boolean;
  estado: string;
  pagoEstado: string;
  datosBorrados: boolean;
  enlacePago: string | null;
  /** W7: cobros a leads en pausa (sin dinero real). */
  cobrosEnPausa?: boolean;
  /** Lead creado fuera de producción (ensayo). */
  esPrueba?: boolean;
  /** Siguiente cobro: tipo y valor, o el motivo por el que no hay. */
  cobro: { tipo: string; monto: number } | { motivo: string };
  valorFinal: number | null;
  valorMedido: number | null;
  pagos: FilaPago[];
  operflow: { proyectoId: string | null; etapa: string | null; estado: string | null; urlPropuesta: string | null };
  mensajes: FilaMensaje[];
};

const TIPO: Record<string, string> = { diseno: "Diseño", anticipo: "Anticipo", saldo: "Saldo", tienda: "Tienda" };
const ESTADO_PAGO: Record<string, string> = {
  aprobado: "Aprobado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  devuelto: "Devuelto",
  revisar: "Revisar",
};
const MENSAJE: Record<string, string> = { A: "Crear proyecto", C: "Pago registrado", E: "Borrar proyecto" };
const ESTADO_MENSAJE: Record<string, string> = { pendiente: "Pendiente", enviado: "Enviado", fallido: "Falló", cancelado: "Cancelado" };

const campo = "w-full border border-neutral-300 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink disabled:opacity-50";
const rotulo = "block text-xs font-semibold uppercase tracking-wider text-ink-muted";
const boton =
  "border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";
const botonSuave = "border border-neutral-300 px-4 py-2.5 text-sm text-ink hover:border-ink disabled:opacity-50";
const botonPeligro =
  "border border-red-700 px-4 py-2.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

export function PanelPagos(p: Props) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [nota, setNota] = useState("");
  const [valor, setValor] = useState("");
  const [render, setRender] = useState(false);
  const [confirmar, setConfirmar] = useState("");
  const [copiado, setCopiado] = useState(false);

  function hacer(accion: () => Promise<Resultado & { borrado?: boolean }>, exito: string, despues?: () => void) {
    setMensaje(null);
    iniciar(async () => {
      const r = await accion();
      if (r.ok) {
        setMensaje({ ok: true, texto: exito });
        despues?.();
        if (r.borrado) router.push("/admin/leads");
        else router.refresh();
      } else {
        setMensaje({ ok: false, texto: r.error });
        router.refresh();
      }
    });
  }

  const medido = p.pagoEstado === "anticipo" || p.pagoEstado === "saldo";
  // Gerencia puede poner (o corregir) el valor mientras no se haya pagado lo que depende de él.
  const pideValor =
    p.esGerencia && !p.datosBorrados && ((p.pagoEstado === "diseno" && ["diseno_pagado", "propuesta_enviada"].includes(p.estado)) || medido);
  const valorActual = medido ? p.valorMedido : p.valorFinal;
  const puedeNoAprobo = !p.datosBorrados && p.pagoEstado === "diseno" && ["diseno_pagado", "propuesta_enviada"].includes(p.estado);
  const hayPendientes = p.mensajes.some((m) => m.estado === "pendiente" || m.estado === "fallido");

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-ink">Pagos</h2>

      <div className="mt-4 grid gap-4 border border-neutral-200 bg-white p-4 md:grid-cols-2">
        <div>
          <p className={rotulo}>Siguiente pago</p>
          {"monto" in p.cobro ? (
            <p className="mt-2 text-sm text-ink">
              {TIPO[p.cobro.tipo]}: <strong>{pesos(p.cobro.monto)}</strong>
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">{p.cobro.motivo}</p>
          )}
        </div>

        <div>
          <p className={rotulo}>Valor final</p>
          <p className="mt-2 text-sm text-ink">
            Propuesta: {pesos(p.valorFinal)} · Con medidas: {pesos(p.valorMedido)}
          </p>
        </div>

        {p.cobrosEnPausa && "monto" in p.cobro && (
          <p className="text-xs text-ink-muted md:col-span-2">
            Cobros en línea en pausa: no hay enlace de pago. {p.esPrueba ? "En este lead de ensayo usa \"Registrar a mano\" (no mueve dinero)." : "Este lead no se puede cobrar por ahora."}
          </p>
        )}

        {p.enlacePago && "monto" in p.cobro && (
          <div className="md:col-span-2">
            <p className={rotulo}>Enlace de pago para el cliente</p>
            <div className="mt-2 flex gap-2">
              <input readOnly className={campo} value={p.enlacePago} aria-label="Enlace de pago" onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className={botonSuave}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(p.enlacePago!);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  } catch {
                    setCopiado(false);
                  }
                }}
              >
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-muted">Mándalo por WhatsApp. Siempre cobra el siguiente pago, con el valor que calcula el sistema.</p>
          </div>
        )}
      </div>

      {p.pagos.length > 0 && (
        <ul className="mt-3 divide-y divide-neutral-200 border border-neutral-200 bg-white">
          {p.pagos.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="text-ink">
                {TIPO[x.tipo] ?? x.tipo} · {pesos(x.monto)}
                {x.devuelto > 0 && x.devuelto < x.monto ? ` (devuelto ${pesos(x.devuelto)}, cuenta ${pesos(x.monto - x.devuelto)})` : ""}
                <span className="text-xs text-ink-muted"> · {x.origen} · {x.cuando}</span>
              </span>
              <span
                className={`border px-2 py-0.5 text-xs ${
                  x.estado === "aprobado" && x.cuenta
                    ? "border-green-700 bg-green-50 text-green-800"
                    : x.estado === "revisar" || x.estado === "devuelto"
                      ? "border-red-300 bg-red-50 text-red-800"
                      : "border-neutral-300 text-ink-muted"
                }`}
              >
                {ESTADO_PAGO[x.estado] ?? x.estado}
                {x.resuelto ? " · resuelto" : ""}
              </span>
              {p.esGerencia && (x.estado === "revisar" || x.estado === "devuelto") && !x.resuelto && (
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="border border-neutral-300 px-3 py-1 text-xs text-ink hover:border-ink disabled:opacity-50"
                    disabled={guardando}
                    onClick={() => {
                      const nota = window.prompt(
                        "Úsalo SOLO después de devolverle TODO este pago al cliente en Mercado Pago. Escribe cómo y cuándo (ej: devuelto en MP el 20/11):",
                      );
                      if (nota && nota.trim().length >= 3) hacer(() => resolverPago(p.leadId, x.id, nota, "devuelto"), "Pago marcado como devuelto.");
                    }}
                  >
                    Se devolvió todo
                  </button>
                  {x.estado === "revisar" && (
                    <button
                      type="button"
                      className="border border-neutral-300 px-3 py-1 text-xs text-ink hover:border-ink disabled:opacity-50"
                      disabled={guardando}
                      onClick={() => {
                        const nota = window.prompt(
                          "La plata se queda y cuenta como abono de este pago; el siguiente cobro pedirá solo lo que falte. Escribe el motivo:",
                        );
                        if (nota && nota.trim().length >= 3) hacer(() => resolverPago(p.leadId, x.id, nota, "conservar"), "Pago conservado como abono.");
                      }}
                    >
                      Se queda (abono)
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {mensaje && (
        <p
          role="status"
          className={`mt-3 border p-3 text-sm ${mensaje.ok ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
        >
          {mensaje.texto}
        </p>
      )}

      {pideValor && (
        <form
          className="mt-4 border border-neutral-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const v = Number(valor);
            const pregunta =
              `¿Confirmas ${medido ? "el valor con medidas confirmadas" : "el valor final de la propuesta"}: ${pesos(v)}?` +
              (valorActual ? `\n\nReemplaza ${pesos(valorActual)}. Un cobro abierto con el valor anterior ya no contará si el cliente lo paga.` : "");
            if (window.confirm(pregunta)) hacer(() => ponerValorFinal(p.leadId, v, medido), "Valor guardado.", () => setValor(""));
          }}
        >
          <label htmlFor="valor" className={rotulo}>
            {valorActual ? "Corregir: " : ""}
            {medido ? "Valor final con medidas confirmadas" : "Valor final de la propuesta"}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="valor"
              inputMode="numeric"
              className={campo}
              placeholder="Pesos, sin puntos. Ej: 18500000"
              value={valor}
              disabled={guardando}
              onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))}
            />
            <button type="submit" className={boton} disabled={guardando || !valor}>
              Guardar
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {valor ? `${pesos(Number(valor))}. ` : ""}Mientras Operflow no esté conectado, lo escribe gerencia. Con esto se calcula{" "}
            {medido ? "el saldo" : "el anticipo"}.
          </p>
        </form>
      )}

      {p.esGerencia && !p.datosBorrados && "monto" in p.cobro && (!p.cobrosEnPausa || p.esPrueba) && (
        <form
          className="mt-4 border border-neutral-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!("monto" in p.cobro)) return;
            const { tipo, monto } = p.cobro;
            if (window.confirm(`¿Confirmas que el cliente ya pagó ${TIPO[tipo]?.toLowerCase()} por ${pesos(monto)} fuera de Mercado Pago?`)) {
              hacer(() => marcarPagoManual(p.leadId, nota, monto), "Pago registrado.", () => setNota(""));
            }
          }}
        >
          <label htmlFor="nota-pago" className={rotulo}>
            Registrar a mano: {TIPO[p.cobro.tipo]} por {pesos(p.cobro.monto)}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="nota-pago"
              className={campo}
              maxLength={300}
              placeholder="Cómo pagó, sin nombres. Ej: transferencia Bancolombia 19/11"
              value={nota}
              disabled={guardando}
              onChange={(e) => setNota(e.target.value)}
            />
            <button type="submit" className={botonSuave} disabled={guardando || nota.trim().length < 3}>
              Registrar
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-muted">Solo si el cliente pagó por fuera de Mercado Pago. Queda en el historial con tu nombre.</p>
        </form>
      )}

      <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-muted">Operflow</h3>
      <div className="mt-2 border border-neutral-200 bg-white p-4 text-sm text-ink">
        {p.operflow.proyectoId || p.mensajes.length ? (
          <>
            <p>
              Proyecto: {p.operflow.proyectoId ?? "todavía no creado"}
              {p.operflow.etapa ? ` · Etapa: ${p.operflow.etapa}` : ""}
              {p.operflow.estado ? ` · ${p.operflow.estado}` : ""}
            </p>
            {p.operflow.urlPropuesta && (
              <a href={p.operflow.urlPropuesta} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">
                Ver propuesta
              </a>
            )}
            <ul className="mt-3 space-y-1 text-xs text-ink-muted">
              {p.mensajes.map((m) => (
                <li key={m.id}>
                  {MENSAJE[m.mensaje] ?? m.mensaje}: {ESTADO_MENSAJE[m.estado] ?? m.estado}
                  {m.intentos ? ` · ${m.intentos} intento(s)` : ""}
                  {m.error && m.estado !== "enviado" ? ` · ${m.error}` : ""}
                </li>
              ))}
            </ul>
            {p.esGerencia && hayPendientes && (
              <button
                type="button"
                className={`mt-3 ${botonSuave}`}
                disabled={guardando}
                onClick={() => hacer(() => reenviarOperflow(p.leadId), "Operflow recibió los mensajes.")}
              >
                Reenviar a Operflow
              </button>
            )}
          </>
        ) : (
          <p className="text-ink-muted">Se envía solo cuando el cliente paga el diseño.</p>
        )}
      </div>

      {puedeNoAprobo && (
        <div className="mt-6 border border-neutral-200 bg-white p-4">
          <p className={rotulo}>El cliente no aprobó el diseño</p>
          <p className="mt-2 text-sm text-ink-muted">
            Se borran sus datos personales, fotos y notas, aquí y en Operflow. Se conservan los pagos. El diseño no se devuelve.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={render} disabled={guardando} onChange={(e) => setRender(e.target.checked)} />
            Ya le entregué el render al cliente
          </label>
          <button
            type="button"
            className={`mt-3 ${botonPeligro}`}
            disabled={guardando || !render}
            onClick={() => {
              if (window.confirm("¿Seguro? Se borran los datos del cliente y no se pueden recuperar.")) {
                hacer(() => noAprobo(p.leadId, render), "Listo: el lead quedó en 'No aprobó' y sus datos se borraron.");
              }
            }}
          >
            Marcar &quot;No aprobó&quot;
          </button>
        </div>
      )}

      {p.esGerencia && !p.datosBorrados && (
        <details className="mt-6 border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer text-sm text-ink">Borrar los datos de este cliente</summary>
          <p className="mt-2 text-sm text-ink-muted">
            {p.pagoEstado === "nada"
              ? "Nunca pagó: se borra todo (cliente, lead, notas y fotos)."
              : "Ya pagó: se borran sus datos personales, fotos y notas; se conservan los pagos, como pide la ley."}{" "}
            No se puede deshacer.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className={campo}
              placeholder="Escribe BORRAR"
              value={confirmar}
              disabled={guardando}
              onChange={(e) => setConfirmar(e.target.value)}
              aria-label="Confirmación"
            />
            <button
              type="button"
              className={botonPeligro}
              disabled={guardando || confirmar !== "BORRAR"}
              onClick={() => hacer(() => borrarCliente(p.leadId, confirmar), "Datos borrados.", () => setConfirmar(""))}
            >
              Borrar
            </button>
          </div>
        </details>
      )}
    </section>
  );
}
