/**
 * Cálculo del rango de precio de una cocina y de los pagos (W2).
 * Corre en el servidor: el navegador nunca decide montos de cobro.
 *
 * Fórmula (provisional, ver docs/DECISIONES.md 2026-11-18):
 *   metros = suma de las paredes que usa la forma
 *   base   = metros × precio por metro del diseño  +  metros de isla × precio de isla
 *   total  = base × (1 + recargo color) × (1 + recargo herrajes)
 *   rango  = total ± incertidumbre, redondeado hacia afuera
 */
import type { EntradaRango, Forma, MedidasAprox, Rango, TablaPrecios } from "./tipos";

export const LIMITES_MM = {
  pared: { min: 600, max: 12_000 },
  isla: { min: 600, max: 5_000 },
} as const;

export class ErrorPrecio extends Error {
  constructor(
    message: string,
    public readonly campo: string,
  ) {
    super(message);
    this.name = "ErrorPrecio";
  }
}

const PAREDES_POR_FORMA: Record<Forma, (keyof MedidasAprox)[]> = {
  lineal: ["pared_a"],
  L: ["pared_a", "pared_b"],
  U: ["pared_a", "pared_b", "pared_c"],
  isla: ["pared_a"],
};

function medidaValida(valor: unknown, campo: string, limite: { min: number; max: number }): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new ErrorPrecio(`Falta la medida ${campo}`, campo);
  }
  if (valor < limite.min || valor > limite.max) {
    throw new ErrorPrecio(
      `La medida ${campo} debe estar entre ${limite.min / 1000} y ${limite.max / 1000} metros`,
      campo,
    );
  }
  return valor;
}

/** Metros lineales de muebles y de isla según la forma. */
export function metrosPorForma(forma: Forma, medidas: MedidasAprox): { lineales: number; isla: number } {
  const paredes = PAREDES_POR_FORMA[forma];
  if (!paredes) throw new ErrorPrecio("Forma de cocina no válida", "forma");
  const mm = paredes.reduce((suma, campo) => suma + medidaValida(medidas[campo], campo, LIMITES_MM.pared), 0);
  const islaMm = forma === "isla" ? medidaValida(medidas.isla, "isla", LIMITES_MM.isla) : 0;
  return { lineales: mm / 1000, isla: islaMm / 1000 };
}

const abajo = (valor: number, multiplo: number) => Math.floor(valor / multiplo) * multiplo;
const arriba = (valor: number, multiplo: number) => Math.ceil(valor / multiplo) * multiplo;

export function calcularRango(tabla: TablaPrecios, entrada: EntradaRango): Rango {
  const precioMetro = tabla.metro_lineal[entrada.diseno];
  if (!precioMetro) throw new ErrorPrecio("Diseño base no válido", "diseno");
  const color = tabla.colores[entrada.color];
  if (!color) throw new ErrorPrecio("Color no válido", "color");
  const herrajes = tabla.herrajes[entrada.herrajes];
  if (!herrajes) throw new ErrorPrecio("Nivel de herrajes no válido", "herrajes");

  const { lineales, isla } = metrosPorForma(entrada.forma, entrada.medidas_mm);
  const base = lineales * precioMetro + isla * tabla.isla_metro_lineal;
  const total = base * (1 + color.recargo_pct / 100) * (1 + herrajes.recargo_pct / 100);
  const margen = tabla.incertidumbre_pct / 100;

  return {
    min: abajo(total * (1 - margen), tabla.redondeo),
    max: arriba(total * (1 + margen), tabla.redondeo),
    estimado: Math.round(total),
    moneda: "COP",
    metros_lineales: lineales,
    metros_isla: isla,
    ciudad: tabla.ciudad,
    vigente_desde: tabla.vigente_desde,
  };
}

function montoValido(valor: number, campo: string): number {
  if (!Number.isInteger(valor) || valor < 0) throw new ErrorPrecio(`${campo} debe ser un entero positivo`, campo);
  return valor;
}

/**
 * Anticipo al aprobar el diseño: % del valor final menos el diseño ya pagado.
 * Nunca es negativo.
 */
export function calcularAnticipo(valorFinal: number, valorDisenoPagado: number, anticipoPct: number): number {
  montoValido(valorFinal, "valor final");
  montoValido(valorDisenoPagado, "valor del diseño");
  return Math.max(0, Math.round((valorFinal * anticipoPct) / 100) - valorDisenoPagado);
}

/**
 * Saldo tras confirmar medidas: valor final recalculado menos todo lo pagado
 * (diseño + anticipo). Puede ser 0 si ya se pagó todo; nunca negativo
 * (si sobra, eso es una devolución y se maneja aparte).
 */
export function calcularSaldo(valorFinalRecalculado: number, totalPagado: number): number {
  montoValido(valorFinalRecalculado, "valor final");
  montoValido(totalPagado, "total pagado");
  return Math.max(0, valorFinalRecalculado - totalPagado);
}

/**
 * Devolución si tras medir el cliente no acepta el valor ajustado:
 * el anticipo menos la visita de medición. El diseño no se devuelve.
 */
export function calcularDevolucionTrasMedicion(anticipoPagado: number, costoVisita: number): number {
  montoValido(anticipoPagado, "anticipo");
  montoValido(costoVisita, "costo de la visita");
  return Math.max(0, anticipoPagado - costoVisita);
}
