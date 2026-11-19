"use client";

import { useState, useTransition } from "react";
import { copiarOrdenesRedis } from "@/app/admin/acciones-ordenes";

/** Botón único de gerencia: copia las órdenes antiguas de Redis a Supabase sin duplicar (W5). */
export function CopiarRedis() {
  const [ocupado, iniciar] = useTransition();
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={ocupado}
        className="inline-flex items-center justify-center border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
        onClick={() =>
          iniciar(async () => {
            const r = await copiarOrdenesRedis();
            setTexto(r.ok ? `Leídas ${r.leidas} · copiadas ${r.copiadas} · omitidas ${r.omitidas}` : r.error);
          })
        }
      >
        {ocupado ? "Copiando…" : "Copiar órdenes viejas"}
      </button>
      {texto && <span role="status" className="text-xs text-ink-muted">{texto}</span>}
    </div>
  );
}
