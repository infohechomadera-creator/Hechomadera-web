/** Nombres legibles para mostrar la configuración de un lead en el panel. */
import { DISENOS_COCINA, FORMAS_COCINA } from "@/content/cocinas";
import { ELECTRODOMESTICOS } from "@/lib/configurador/validar";

export interface ConfiguracionGuardada {
  origen?: string;
  forma?: string;
  diseno?: string;
  color?: string;
  herrajes?: string;
  electrodomesticos?: string[];
  medidas_mm?: Record<string, number>;
  precios_vigente_desde?: string;
}

export const nombreForma = (id?: string) => FORMAS_COCINA.find((f) => f.id === id)?.nombre ?? id ?? "—";
export const nombreDiseno = (id?: string) => DISENOS_COCINA.find((d) => d.id === id)?.nombre ?? id ?? "—";
export const nombreElectro = (id: string) => (ELECTRODOMESTICOS as Record<string, string>)[id] ?? id;

export const ETIQUETA_ESTADO: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  diseno_pagado: "Diseño pagado",
  propuesta_enviada: "Propuesta enviada",
  aprobado: "Aprobado",
  no_aprobo: "No aprobó",
  perdido: "Perdido",
};

export const pesos = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(iso));
