/**
 * La ficha de un lead (que firma enlaces de fotos):
 *  - sin sesión: "no encontrado", sin leer ni firmar;
 *  - asesor con un lead ajeno (la RLS no se lo devuelve): "no encontrado", sin firmar fotos.
 */
import { describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ rol: null as string | null, leyo: false, firmo: false }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NO_ENCONTRADO");
  },
}));
vi.mock("@/lib/sesion", () => ({ rolActual: async () => estado.rol }));
vi.mock("@/lib/supabase/servidor", () => {
  // Imita a Supabase con RLS: el lead pedido no existe para quien pregunta.
  const consulta: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "returns"]) consulta[m] = () => consulta;
  consulta.maybeSingle = async () => ({ data: null, error: null });
  return {
    clienteUsuario: async () => {
      estado.leyo = true;
      return { from: () => consulta, rpc: async () => ({ data: [] }) };
    },
    clienteSistema: () => {
      estado.firmo = true;
      throw new Error("no debería firmar");
    },
  };
});

const ID = "4b6f9c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("/admin/leads/[id]", () => {
  it("sin sesión responde 'no encontrado' sin leer ni firmar", async () => {
    Object.assign(estado, { rol: null, leyo: false, firmo: false });
    const { default: Pagina } = await import("@/app/admin/leads/[id]/page");
    await expect(Pagina({ params: Promise.resolve({ id: ID }) })).rejects.toThrow("NO_ENCONTRADO");
    expect(estado.leyo).toBe(false);
    expect(estado.firmo).toBe(false);
  });

  it("un asesor con un lead ajeno ve 'no encontrado' y no se firman fotos", async () => {
    Object.assign(estado, { rol: "asesor", leyo: false, firmo: false });
    const { default: Pagina } = await import("@/app/admin/leads/[id]/page");
    await expect(Pagina({ params: Promise.resolve({ id: ID }) })).rejects.toThrow("NO_ENCONTRADO");
    expect(estado.leyo).toBe(true);
    expect(estado.firmo).toBe(false);
  });

  it("un id que no es uuid ni siquiera consulta", async () => {
    Object.assign(estado, { rol: "gerencia", leyo: false, firmo: false });
    const { default: Pagina } = await import("@/app/admin/leads/[id]/page");
    await expect(Pagina({ params: Promise.resolve({ id: "../x" }) })).rejects.toThrow("NO_ENCONTRADO");
    expect(estado.leyo).toBe(false);
  });
});
