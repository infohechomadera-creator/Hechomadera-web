/**
 * Catálogo que el agente de IA (W6) puede ofrecer: solo nombres y descripciones.
 * Nunca lleva precios ni recargos: el agente no conoce la tabla de precios.
 */
import { DISENOS_COCINA, FORMAS_COCINA } from "@/content/cocinas";
import { ELECTRODOMESTICOS } from "@/lib/configurador/validar";
import { LIMITES_MM } from "@/lib/precios/calcular";
import { CIUDADES_ACTIVAS, NIVELES_HERRAJES, type CiudadActiva, type TablaPrecios } from "@/lib/precios/tipos";

export type Tablas = Record<CiudadActiva, TablaPrecios>;

/** Colores de una ciudad en orden estable (del más sencillo al más especial, luego por id). */
export function coloresDe(tabla: TablaPrecios): { id: string; nombre: string }[] {
  return Object.entries(tabla.colores)
    .sort((a, b) => a[1].recargo_pct - b[1].recargo_pct || a[0].localeCompare(b[0]))
    .map(([id, v]) => ({ id, nombre: v.nombre }));
}

/** Todos los ids de color de todas las ciudades, ordenados (para la definición de la herramienta). */
export function todosLosColores(tablas: Tablas): string[] {
  return [...new Set(CIUDADES_ACTIVAS.flatMap((c) => Object.keys(tablas[c].colores)))].sort();
}

const metros = (mm: number) => String(mm / 1000).replace(".", ",");

/** Texto del catálogo para las instrucciones del agente. Determinista (mismo texto con la misma tabla). */
export function textoCatalogo(tablas: Tablas): string {
  const lineas: string[] = [];
  lineas.push(`Ciudades: ${CIUDADES_ACTIVAS.join(", ")}.`);
  lineas.push("Formas (id: nombre — descripción):");
  for (const f of FORMAS_COCINA) lineas.push(`- ${f.id}: ${f.nombre} — ${f.descripcion}`);
  lineas.push("Diseños base:");
  for (const d of DISENOS_COCINA) lineas.push(`- ${d.id}: ${d.nombre} — ${d.descripcion}`);
  for (const c of CIUDADES_ACTIVAS) {
    lineas.push(`Colores en ${c}: ${coloresDe(tablas[c]).map((o) => `${o.id} (${o.nombre})`).join("; ")}.`);
    lineas.push(
      `Herrajes en ${c}: ${NIVELES_HERRAJES.map((h) => `${h} (${tablas[c].herrajes[h]?.nombre ?? h})`).join("; ")}.`,
    );
  }
  lineas.push(
    `Electrodomésticos (opcionales, no cambian el rango): ${Object.entries(ELECTRODOMESTICOS)
      .map(([id, n]) => `${id} (${n})`)
      .join("; ")}.`,
  );
  lineas.push(
    "Medidas que pide cada forma (en metros): lineal → pared_a; L → pared_a y pared_b; U → pared_a, pared_b y pared_c; isla → pared_a e isla.",
  );
  lineas.push(
    `Cada pared entre ${metros(LIMITES_MM.pared.min)} y ${metros(LIMITES_MM.pared.max)} m; la isla entre ${metros(LIMITES_MM.isla.min)} y ${metros(LIMITES_MM.isla.max)} m.`,
  );
  return lineas.join("\n");
}
