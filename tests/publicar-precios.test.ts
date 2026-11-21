/** La acción `publicarPrecios` es la única forma de escribir precios: se prueba su barrera. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";

let rol: "gerencia" | "asesor" | null = null;
const insertados: unknown[] = [];

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/sesion", () => ({ rolActual: async () => rol }));
vi.mock("@/lib/precios/fechas", () => ({ hoyEnColombia: () => "2026-11-18" }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteUsuario: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "gerencia-1" } } }) },
    from: () => ({ insert: async (fila: unknown) => (insertados.push(fila), { error: null }) }),
  }),
}));

const publicar = async (ciudad: string, fecha: string) => {
  const { publicarPrecios } = await import("@/app/admin/precios/acciones");
  return publicarPrecios(ciudad, fecha, PRECIOS_EJEMPLO.Barranquilla);
};

describe("publicarPrecios", () => {
  beforeEach(() => {
    insertados.length = 0;
  });

  it("rechaza al público y al asesor sin escribir nada", async () => {
    for (const r of [null, "asesor"] as const) {
      rol = r;
      expect((await publicar("Barranquilla", "2026-11-18")).ok).toBe(false);
    }
    expect(insertados).toHaveLength(0);
  });

  it("rechaza una fecha pasada o mal escrita y una ciudad no válida", async () => {
    rol = "gerencia";
    expect((await publicar("Barranquilla", "2026-11-17")).ok).toBe(false);
    expect((await publicar("Barranquilla", "18/11/2026")).ok).toBe(false);
    expect((await publicar("Bogotá", "2026-11-18")).ok).toBe(false);
    expect(insertados).toHaveLength(0);
  });

  it("gerencia publica a su nombre, con la ciudad y la fecha que eligió", async () => {
    rol = "gerencia";
    const r = await publicar("Santa Marta", "2026-11-20");
    expect(r).toEqual({ ok: true, vigente_desde: "2026-11-20" });
    expect(insertados[0]).toMatchObject({
      ciudad: "Santa Marta",
      vigente_desde: "2026-11-20",
      creado_por: "gerencia-1",
      datos: { ciudad: "Santa Marta", vigente_desde: "2026-11-20", moneda: "COP" },
    });
  });
});
