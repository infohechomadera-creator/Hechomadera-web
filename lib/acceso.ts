/**
 * Quién puede entrar a cada zona interna (W1). Función pura para poder probarla.
 *  - Gerencia: todo lo interno (órdenes, exportar, página de prueba de pago).
 *  - Asesor: por ahora nada de órdenes; su panel de leads llega en W4.
 *  - Contraseña antigua (ADMIN_PASSWORD): respaldo temporal con permisos de gerencia,
 *    hasta confirmar el login nuevo. Se retira al cerrar W1.
 */
export type Rol = "gerencia" | "asesor";

export type Decision = "permitir" | "ir_a_login" | "sin_permiso" | "no_autorizado_api";

const PUBLICAS = new Set(["/admin/login", "/api/admin/auth"]);

export function zonaProtegida(ruta: string): boolean {
  return ruta.startsWith("/admin") || ruta.startsWith("/api/admin") || ruta === "/pago/prueba";
}

export function decidirAcceso(ruta: string, rol: Rol | null, respaldoAntiguo = false): Decision {
  if (!zonaProtegida(ruta) || PUBLICAS.has(ruta)) return "permitir";
  const esApi = ruta.startsWith("/api/");
  const efectivo: Rol | null = rol ?? (respaldoAntiguo ? "gerencia" : null);
  if (!efectivo) return esApi ? "no_autorizado_api" : "ir_a_login";
  if (efectivo === "gerencia") return "permitir";
  // Asesor: sin acceso a órdenes ni pagos de prueba.
  return esApi ? "no_autorizado_api" : "sin_permiso";
}
