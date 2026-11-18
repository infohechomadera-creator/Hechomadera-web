/** El detalle de un lead (que firma enlaces de fotos) se niega a quien no es gerencia. */
import { describe, expect, it, vi } from "vitest";

const rol = vi.hoisted(() => ({ actual: "asesor" as string | null, firmo: false }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NO_ENCONTRADO");
  },
}));
vi.mock("@/lib/sesion", () => ({ rolActual: async () => rol.actual }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteUsuario: async () => {
    throw new Error("no debería leer");
  },
  clienteSistema: () => {
    rol.firmo = true;
    throw new Error("no debería firmar");
  },
}));

const ID = "4b6f9c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("/admin/leads/[id]", () => {
  for (const r of ["asesor", null]) {
    it(`con rol ${r ?? "sin sesión"} responde "no encontrado" y no firma enlaces`, async () => {
      rol.actual = r;
      const { default: Pagina } = await import("@/app/admin/leads/[id]/page");
      await expect(Pagina({ params: Promise.resolve({ id: ID }) })).rejects.toThrow("NO_ENCONTRADO");
      expect(rol.firmo).toBe(false);
    });
  }

  it("un id que no es uuid ni siquiera consulta", async () => {
    rol.actual = "gerencia";
    const { default: Pagina } = await import("@/app/admin/leads/[id]/page");
    await expect(Pagina({ params: Promise.resolve({ id: "../x" }) })).rejects.toThrow("NO_ENCONTRADO");
  });
});
