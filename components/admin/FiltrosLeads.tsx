"use client";

import { useRouter } from "next/navigation";

export type Filtro = {
  clave: "estado" | "filtro" | "asesor";
  etiqueta: string;
  /** Texto de la opción "sin filtro". */
  todos: string;
  opciones: { valor: string; texto: string }[];
};

/** Filtros de la lista de leads en listas desplegables. Cambiar una opción recarga la lista con ese filtro. */
export function FiltrosLeads({ filtros, actual }: { filtros: Filtro[]; actual: Partial<Record<Filtro["clave"], string>> }) {
  const router = useRouter();
  const activos = filtros.filter((f) => actual[f.clave]).length;

  function cambiar(clave: Filtro["clave"], valor: string) {
    const q = new URLSearchParams();
    for (const f of filtros) {
      const v = f.clave === clave ? valor : actual[f.clave];
      if (v) q.set(f.clave, v);
    }
    const s = q.toString();
    router.push(s ? `/admin/leads?${s}` : "/admin/leads");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {filtros.map((f) => (
        <label key={f.clave} className="block sm:w-56">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{f.etiqueta}</span>
          <select
            className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none ${actual[f.clave] ? "border-ink" : "border-neutral-300"}`}
            value={actual[f.clave] ?? ""}
            onChange={(e) => cambiar(f.clave, e.target.value)}
          >
            <option value="">{f.todos}</option>
            {f.opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
      ))}
      {activos > 0 && (
        <button type="button" className="self-start py-2.5 text-sm text-ink underline underline-offset-4 sm:self-end" onClick={() => router.push("/admin/leads")}>
          Quitar filtros ({activos})
        </button>
      )}
    </div>
  );
}
