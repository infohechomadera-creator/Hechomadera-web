/** Fecha de hoy (AAAA-MM-DD) en Colombia, sin depender de la zona del servidor. */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(ahora);
}
