/** Tipos del catálogo de cocinas y de la tabla de precios por ciudad (W2). */

export const FORMAS = ["lineal", "L", "U", "isla"] as const;
export type Forma = (typeof FORMAS)[number];

export const DISENOS = ["D1", "D2", "D3", "D4", "D5"] as const;
export type DisenoBase = (typeof DISENOS)[number];

export const NIVELES_HERRAJES = ["estandar", "premium", "alta"] as const;
export type NivelHerrajes = (typeof NIVELES_HERRAJES)[number];

export const PRODUCTOS = [
  "cocina",
  "closet",
  "mueble_bano",
  "centro_entretenimiento",
  "puerta",
  "escritorio",
] as const;
export type Producto = (typeof PRODUCTOS)[number];

export const CIUDADES_ACTIVAS = ["Barranquilla", "Santa Marta"] as const;
export type CiudadActiva = (typeof CIUDADES_ACTIVAS)[number];

/** Opción con recargo porcentual entero (10 = 10%). */
export interface OpcionRecargo {
  nombre: string;
  recargo_pct: number;
}

/**
 * Una versión de la tabla de precios de una ciudad. Es lo que se guarda en
 * `public.precios.datos`. Todos los valores en pesos colombianos (COP), enteros.
 */
export interface TablaPrecios {
  ciudad: string;
  moneda: "COP";
  vigente_desde: string; // AAAA-MM-DD
  /** Precio por metro lineal de cocina (muebles bajos + altos) según diseño base. */
  metro_lineal: Record<DisenoBase, number>;
  /** Precio por metro lineal de isla. */
  isla_metro_lineal: number;
  /** Recargo por gama de color / acabado. La clave es la que elige el cliente. */
  colores: Record<string, OpcionRecargo>;
  herrajes: Record<NivelHerrajes, OpcionRecargo>;
  /** Ancho del rango (±%) porque las medidas del cliente son aproximadas. */
  incertidumbre_pct: number;
  /** El rango se redondea a este múltiplo (por ejemplo 50.000). */
  redondeo: number;
  /** Precio fijo del diseño por producto; se descuenta del anticipo. */
  valor_diseno: Record<Producto, number>;
  /** Porcentaje del anticipo sobre el valor final. */
  anticipo_pct: number;
}

/** Medidas aproximadas en milímetros, como las da el cliente. */
export interface MedidasAprox {
  pared_a: number;
  pared_b?: number;
  pared_c?: number;
  /** Largo de la isla (solo forma "isla"). */
  isla?: number;
}

export interface EntradaRango {
  forma: Forma;
  diseno: DisenoBase;
  color: string;
  herrajes: NivelHerrajes;
  medidas_mm: MedidasAprox;
}

export interface Rango {
  min: number;
  max: number;
  /** Valor central antes de aplicar la incertidumbre. */
  estimado: number;
  moneda: "COP";
  metros_lineales: number;
  metros_isla: number;
  ciudad: string;
  vigente_desde: string;
}
