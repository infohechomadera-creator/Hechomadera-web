"use client";

import { useEffect, useRef, useState } from "react";
import type { EstadoAgente, RangoPantalla } from "@/lib/agente/herramientas";

/** Saludo fijo (no gasta una llamada a la IA). Las instrucciones del agente dicen que la web ya saludó. */
const SALUDO =
  "¡Hola! Soy el asistente de Hechomadera. Te ayudo a armar tu cocina conversando y la web te calcula el rango de precio. ¿En qué ciudad estás y qué forma tiene tu cocina?";

export interface CambiosAgente {
  estado: EstadoAgente;
  rango: RangoPantalla | null;
  contacto: { nombre: string; telefono: string; email: string | null } | null;
}

type Burbuja = { de: "cliente" | "agente" | "web"; texto: string };

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/**
 * Chat con el asistente de IA (W6). Pensado para celular: panel abajo que deja ver el configurador.
 * La conversación vive solo aquí (en memoria): no se guarda. El rango que se muestra lo calcula el servidor.
 */
export function Agente({
  estado,
  onCambios,
  minimizado,
  onMinimizar,
  onCerrar,
}: {
  estado: EstadoAgente;
  onCambios: (c: CambiosAgente) => void;
  minimizado: boolean;
  onMinimizar: (v: boolean) => void;
  onCerrar: () => void;
}) {
  const [historial, setHistorial] = useState<unknown[]>([]);
  const [burbujas, setBurbujas] = useState<Burbuja[]>([{ de: "agente", texto: SALUDO }]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [burbujas, minimizado]);

  async function enviar() {
    const mensaje = texto.trim();
    if (!mensaje || ocupado) return;
    setTexto("");
    setOcupado(true);
    setBurbujas((b) => [...b, { de: "cliente", texto: mensaje }]);
    try {
      const r = await fetch("/api/configurador/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historial, mensaje, estado }),
      });
      let cuerpo: Record<string, unknown> = {};
      try {
        cuerpo = await r.json();
      } catch {
        /* respuesta sin JSON */
      }
      if (!r.ok) {
        if (cuerpo.reiniciar) setHistorial([]);
        setBurbujas((b) => [...b, { de: "web", texto: String(cuerpo.error ?? "Algo falló. Intenta de nuevo o sigue con el formulario.") }]);
        return;
      }
      setHistorial((h) => [...h, ...((cuerpo.historial as unknown[]) ?? [])]);
      const rango = (cuerpo.rango as RangoPantalla | null) ?? null;
      const contacto = (cuerpo.contacto as CambiosAgente["contacto"]) ?? null;
      setBurbujas((b) => [
        ...b,
        ...(rango
          ? [{ de: "web" as const, texto: `Tu rango en ${rango.ciudad}: ${pesos.format(rango.min)} – ${pesos.format(rango.max)}. Lo calcula la web con la tabla vigente.` }]
          : []),
        { de: "agente", texto: String(cuerpo.texto ?? "") },
      ]);
      onCambios({ estado: cuerpo.estado as EstadoAgente, rango, contacto });
    } catch {
      setBurbujas((b) => [...b, { de: "web", texto: "Sin conexión. Revisa tu internet e intenta de nuevo." }]);
    } finally {
      setOcupado(false);
    }
  }

  if (minimizado) {
    return (
      <button
        type="button"
        onClick={() => onMinimizar(false)}
        className="fixed bottom-24 right-4 z-40 border border-ink bg-ink px-4 py-3 text-sm font-medium text-paper shadow-lg"
      >
        Seguir conversando
      </button>
    );
  }

  return (
    <section
      aria-label="Asistente de Hechomadera"
      className="fixed inset-x-0 bottom-0 z-[120] flex h-[55dvh] flex-col border-t border-ink bg-paper shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:h-[70vh] md:w-[400px] md:border"
    >
      <header className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2">
        <div>
          <p className="text-sm font-semibold text-ink">Asistente Hechomadera</p>
          <p className="text-[11px] leading-tight text-ink-muted">Con IA. No da precios: el rango lo calcula la web. No escribas datos sensibles.</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="px-2 py-1 text-xs text-ink underline-offset-4 hover:underline" onClick={() => onMinimizar(true)}>
            Ver formulario
          </button>
          <button type="button" aria-label="Cerrar el asistente" className="px-2 py-1 text-lg leading-none text-ink" onClick={onCerrar}>
            ×
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {burbujas.map((b, i) => (
          <p
            key={i}
            className={
              b.de === "cliente"
                ? "ml-auto max-w-[85%] whitespace-pre-wrap bg-ink px-3 py-2 text-sm text-paper"
                : b.de === "agente"
                  ? "mr-auto max-w-[85%] whitespace-pre-wrap border border-neutral-200 bg-white px-3 py-2 text-sm text-ink"
                  : "mx-auto max-w-[95%] border border-ink bg-white px-3 py-2 text-center text-sm font-medium text-ink"
            }
          >
            {b.texto}
          </p>
        ))}
        {ocupado && <p className="mr-auto text-xs text-ink-muted">Escribiendo…</p>}
        <div ref={fin} />
      </div>

      <form
        className="flex gap-2 border-t border-neutral-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <input
          className="min-w-0 flex-1 border border-neutral-300 bg-white px-3 py-3 text-base text-ink focus:border-ink focus:outline-none"
          placeholder="Escribe aquí…"
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Tu mensaje"
        />
        <button
          type="submit"
          disabled={ocupado || !texto.trim()}
          className="border border-ink bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
