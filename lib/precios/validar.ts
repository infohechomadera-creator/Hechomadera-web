/**
 * Valida una tabla de precios antes de guardarla (gerencia) o de usarla.
 * Devuelve la lista de problemas en español; vacía si todo está bien.
 */
import { DISENOS, NIVELES_HERRAJES, PRODUCTOS, type TablaPrecios } from "./tipos";

const esEnteroPositivo = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v > 0;
const esPct = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;

export function validarTablaPrecios(t: unknown): string[] {
  const p: string[] = [];
  if (!t || typeof t !== "object") return ["La tabla de precios está vacía"];
  const x = t as Partial<TablaPrecios>;

  if (typeof x.ciudad !== "string" || !x.ciudad.trim()) p.push("Falta la ciudad");
  if (x.moneda !== "COP") p.push("La moneda debe ser COP");
  if (typeof x.vigente_desde !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.vigente_desde))
    p.push("La fecha de vigencia debe tener la forma AAAA-MM-DD");

  for (const d of DISENOS)
    if (!esEnteroPositivo(x.metro_lineal?.[d])) p.push(`Falta el precio por metro del diseño ${d}`);
  if (!esEnteroPositivo(x.isla_metro_lineal)) p.push("Falta el precio por metro de isla");

  const colores = Object.entries(x.colores ?? {});
  if (colores.length === 0) p.push("Debe haber al menos un color");
  for (const [k, c] of colores)
    if (!c?.nombre || !esPct(c.recargo_pct, 100)) p.push(`El color ${k} necesita nombre y recargo entre 0 y 100%`);

  for (const h of NIVELES_HERRAJES) {
    const o = x.herrajes?.[h];
    if (!o?.nombre || !esPct(o.recargo_pct, 100))
      p.push(`Los herrajes ${h} necesitan nombre y recargo entre 0 y 100%`);
  }

  if (!esPct(x.incertidumbre_pct, 50)) p.push("La incertidumbre debe estar entre 0 y 50%");
  if (!esEnteroPositivo(x.redondeo)) p.push("El redondeo debe ser un entero positivo");
  for (const prod of PRODUCTOS)
    if (!esEnteroPositivo(x.valor_diseno?.[prod])) p.push(`Falta el valor del diseño de ${prod}`);
  if (!esPct(x.anticipo_pct, 100) || !x.anticipo_pct) p.push("El anticipo debe estar entre 1 y 100%");

  return p;
}
