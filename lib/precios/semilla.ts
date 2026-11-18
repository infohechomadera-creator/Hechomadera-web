/**
 * PRECIOS DE EJEMPLO (genéricos, no reales). Alberto los cambia desde el panel.
 * Esta semilla se carga a `public.precios` en Supabase, que es la única fuente.
 * Mientras Supabase no exista, la web usa esta semilla para mostrar rangos.
 */
import type { CiudadActiva, TablaPrecios } from "./tipos";

const comunes = {
  moneda: "COP",
  vigente_desde: "2026-11-18",
  colores: {
    blanco: { nombre: "Blanco o gris liso", recargo_pct: 0 },
    madera: { nombre: "Textura madera", recargo_pct: 8 },
    color: { nombre: "Color especial o laca", recargo_pct: 15 },
  },
  herrajes: {
    estandar: { nombre: "Estándar", recargo_pct: 0 },
    premium: { nombre: "Cierre lento", recargo_pct: 10 },
    alta: { nombre: "Alta gama (europeos)", recargo_pct: 22 },
  },
  incertidumbre_pct: 12,
  redondeo: 50_000,
  valor_diseno: {
    cocina: 300_000,
    closet: 150_000,
    mueble_bano: 150_000,
    centro_entretenimiento: 200_000,
    puerta: 100_000,
    escritorio: 100_000,
  },
  anticipo_pct: 35,
} as const satisfies Omit<TablaPrecios, "ciudad" | "metro_lineal" | "isla_metro_lineal">;

export const PRECIOS_EJEMPLO: Record<CiudadActiva, TablaPrecios> = {
  Barranquilla: {
    ...comunes,
    colores: { ...comunes.colores },
    herrajes: { ...comunes.herrajes },
    valor_diseno: { ...comunes.valor_diseno },
    ciudad: "Barranquilla",
    metro_lineal: { D1: 1_900_000, D2: 2_100_000, D3: 1_800_000, D4: 2_000_000, D5: 2_200_000 },
    isla_metro_lineal: 2_400_000,
  },
  "Santa Marta": {
    ...comunes,
    colores: { ...comunes.colores },
    herrajes: { ...comunes.herrajes },
    valor_diseno: { ...comunes.valor_diseno },
    ciudad: "Santa Marta",
    metro_lineal: { D1: 2_000_000, D2: 2_200_000, D3: 1_900_000, D4: 2_100_000, D5: 2_300_000 },
    isla_metro_lineal: 2_500_000,
  },
};
