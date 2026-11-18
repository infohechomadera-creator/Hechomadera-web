/**
 * Quién puede entrar a cada zona interna (W1). Función pura para poder probarla.
 *  - Gerencia: todo lo interno (órdenes, exportar, página de prueba de pago).
 *  - Asesor (W4): solo el panel de leads (/admin/leads y la ficha de cada lead). Nada de órdenes,
 *    precios ni API internas. Si entra a /admin (a donde manda el login) se le lleva a sus leads.
 *  - Sin sesión: páginas al login, API con 401.
 */
export type Rol = "gerencia" | "asesor";

export type Decision = "permitir" | "ir_a_login" | "ir_a_leads" | "sin_permiso" | "no_autorizado_api";

const PUBLICAS = new Set(["/admin/login"]);

export function zonaProtegida(ruta: string): boolean {
  return ruta.startsWith("/admin") || ruta.startsWith("/api/admin") || ruta === "/pago/prueba";
}

/** /admin/leads o /admin/leads/<id> (un solo nivel). */
function esPanelLeads(ruta: string): boolean {
  return /^\/admin\/leads(\/[^/]+)?\/?$/.test(ruta);
}

export function decidirAcceso(ruta: string, rol: Rol | null): Decision {
  if (!zonaProtegida(ruta) || PUBLICAS.has(ruta)) return "permitir";
  const esApi = ruta.startsWith("/api/");
  if (!rol) return esApi ? "no_autorizado_api" : "ir_a_login";
  if (rol === "gerencia") return "permitir";
  if (!esApi && esPanelLeads(ruta)) return "permitir";
  if (ruta === "/admin" || ruta === "/admin/") return "ir_a_leads";
  return esApi ? "no_autorizado_api" : "sin_permiso";
}
