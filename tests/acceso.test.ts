import { describe, expect, it } from "vitest";
import { decidirAcceso } from "@/lib/acceso";

describe("acceso a zonas internas", () => {
  it("las páginas públicas no se tocan", () => {
    expect(decidirAcceso("/", null)).toBe("permitir");
    expect(decidirAcceso("/tienda", null)).toBe("permitir");
    expect(decidirAcceso("/cocinas", null)).toBe("permitir");
  });

  it("el login siempre está abierto", () => {
    expect(decidirAcceso("/admin/login", null)).toBe("permitir");
  });

  it("sin sesión: páginas van al login y las API responden 401", () => {
    expect(decidirAcceso("/admin", null)).toBe("ir_a_login");
    expect(decidirAcceso("/admin/orders/abc", null)).toBe("ir_a_login");
    expect(decidirAcceso("/pago/prueba", null)).toBe("ir_a_login");
    expect(decidirAcceso("/api/admin/orders", null)).toBe("no_autorizado_api");
    expect(decidirAcceso("/api/admin/orders/export", null)).toBe("no_autorizado_api");
  });

  it("gerencia entra a todo", () => {
    for (const r of ["/admin", "/admin/orders/abc", "/pago/prueba", "/api/admin/orders", "/api/admin/orders/export"]) {
      expect(decidirAcceso(r, "gerencia")).toBe("permitir");
    }
  });

  it("asesor no ve órdenes ni pagos de prueba", () => {
    expect(decidirAcceso("/admin", "asesor")).toBe("sin_permiso");
    expect(decidirAcceso("/pago/prueba", "asesor")).toBe("sin_permiso");
    expect(decidirAcceso("/api/admin/orders", "asesor")).toBe("no_autorizado_api");
  });

  it("el panel de leads es solo de gerencia por ahora", () => {
    expect(decidirAcceso("/admin/leads", "asesor")).toBe("sin_permiso");
    expect(decidirAcceso("/admin/leads/abc", "asesor")).toBe("sin_permiso");
    expect(decidirAcceso("/admin/leads", null)).toBe("ir_a_login");
    expect(decidirAcceso("/admin/leads", "gerencia")).toBe("permitir");
  });

  it("el configurador y sus API son públicos", () => {
    expect(decidirAcceso("/cocinas/configurar", null)).toBe("permitir");
    expect(decidirAcceso("/api/configurador/lead", null)).toBe("permitir");
  });

  it("asesor no entra al editor de precios", () => {
    expect(decidirAcceso("/admin/precios", "asesor")).toBe("sin_permiso");
    expect(decidirAcceso("/admin/precios", null)).toBe("ir_a_login");
    expect(decidirAcceso("/admin/precios", "gerencia")).toBe("permitir");
  });

  it("la API antigua de contraseña ya no existe como puerta abierta", () => {
    expect(decidirAcceso("/api/admin/auth", null)).toBe("no_autorizado_api");
  });
});
