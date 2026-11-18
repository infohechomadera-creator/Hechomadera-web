/**
 * Quién puede entrar a cada zona interna (W1). Función pura para poder probarla.
 *  - Gerencia: todo lo interno (órdenes, exportar, página de prueba de pago).
 *  - Asesor: por ahora nada de órdenes; su panel de leads llega en W4.
 *  - Sin sesión: páginas al login, API con 401.
 */
export type Rol = "gerencia" | "asesor";

export type Decision = "permitir" | "ir_a_login" | "sin_permiso" | "no_autorizado_api";

const PUBLICAS = new Set(["/admin/login"]);

export function zonaProtegida(ruta: string): boolean {
  return ruta.startsWith("/admin") || ruta.startsWith("/api/admin") || ruta === "/pago/prueba";
}

export function decidirAcceso(ruta: string, rol: Rol | null): Decision {
  if (!zonaProtegida(ruta) || PUBLICAS.has(ruta)) return "permitir";
  const esApi = ruta.startsWith("/api/");
  if (!rol) return esApi ? "no_autorizado_api" : "ir_a_login";
  if (rol === "gerencia") return "permitir";
  return esApi ? "no_autorizado_api" : "sin_permiso";
}
