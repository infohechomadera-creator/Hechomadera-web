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

// ── CRM (W4) ───────────────────────────────────────────────────────────────

/** Estados que se eligen a mano en el panel. Los demás los pone el sistema (pagos, Operflow). */
export const ESTADOS_A_MANO = ["nuevo", "contactado", "perdido"] as const;
export type EstadoAMano = (typeof ESTADOS_A_MANO)[number];
export const esEstadoAMano = (e: unknown): e is EstadoAMano => ESTADOS_A_MANO.includes(e as EstadoAMano);

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const MAX_NOTA = 2000;

/** Devuelve la nota limpia o null si está vacía o es demasiado larga. */
export function validarNota(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const limpia = texto.trim();
  return limpia.length >= 1 && limpia.length <= MAX_NOTA ? limpia : null;
}

/**
 * Próximo contacto: vacío = quitarlo; si no, una fecha real (AAAA-MM-DD) entre hoy y un año.
 * `hoy` es la fecha de Colombia (`hoyEnColombia`).
 */
export function validarProximoContacto(
  fecha: unknown,
  hoy: string,
): { ok: true; fecha: string | null } | { ok: false; error: string } {
  if (fecha == null || fecha === "") return { ok: true, fecha: null };
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Fecha no válida." };
  const d = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fecha) return { ok: false, error: "Fecha no válida." };
  const tope = new Date(`${hoy}T00:00:00Z`);
  tope.setUTCFullYear(tope.getUTCFullYear() + 1);
  if (fecha < hoy) return { ok: false, error: "La fecha no puede ser anterior a hoy." };
  if (d > tope) return { ok: false, error: "La fecha no puede pasar de un año." };
  return { ok: true, fecha };
}

/** El filtro es pagar el diseño: cualquier pago registrado cuenta. */
export const pasoElFiltro = (pago: string | null | undefined) => pago != null && pago !== "nada";

export const ETIQUETA_PAGO: Record<string, string> = {
  nada: "Todavía no paga el diseño",
  diseno: "Pagó el diseño",
  anticipo: "Pagó el anticipo",
  saldo: "Pagó todo",
};

export const fechaDia = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
