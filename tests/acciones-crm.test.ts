/** Acciones del CRM: revisan rol y datos antes de escribir; la base decide el resto. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  rol: "asesor" as string | null,
  escrituras: [] as { tabla: string; tipo: string; datos: unknown }[],
  filas: [{ id: "x" }] as unknown[],
  filtroEstado: null as string[] | null,
  error: null as { code: string } | null,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/sesion", () => ({ rolActual: async () => estado.rol }));
vi.mock("@/lib/precios/fechas", () => ({ hoyEnColombia: () => "2026-11-18" }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteUsuario: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "00000000-0000-4000-a000-00000000000a" } } }) },
    from: (tabla: string) => ({
      update: (datos: unknown) => {
        estado.escrituras.push({ tabla, tipo: "update", datos });
        const q = {
          eq: () => q,
          in: (_c: string, v: string[]) => {
            estado.filtroEstado = v;
            return q;
          },
          select: async () => ({ data: estado.filas, error: estado.error }),
        };
        return q;
      },
      insert: async (datos: unknown) => {
        estado.escrituras.push({ tabla, tipo: "insert", datos });
        return { error: estado.error };
      },
    }),
  }),
}));

import { agregarNota, asignarAsesor, cambiarEstado, ponerProximoContacto } from "@/app/admin/leads/acciones";

const LEAD = "4b6f9c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const OTRO = "00000000-0000-4000-a000-00000000000b";

beforeEach(() => {
  Object.assign(estado, { rol: "asesor", escrituras: [], filas: [{ id: LEAD }], error: null, filtroEstado: null });
});

describe("acciones del CRM", () => {
  it("sin sesión no escribe nada", async () => {
    estado.rol = null;
    expect((await cambiarEstado(LEAD, "contactado")).ok).toBe(false);
    expect((await agregarNota(LEAD, "hola")).ok).toBe(false);
    expect(estado.escrituras).toEqual([]);
  });

  it("el asesor cambia a contactado, pero no a estados del sistema", async () => {
    expect(await cambiarEstado(LEAD, "contactado")).toEqual({ ok: true });
    expect((await cambiarEstado(LEAD, "diseno_pagado")).ok).toBe(false);
    expect((await cambiarEstado(LEAD, "no_aprobo")).ok).toBe(false);
    expect(estado.escrituras).toEqual([{ tabla: "leads", tipo: "update", datos: { estado: "contactado" } }]);
  });

  it("el cambio de estado solo aplica si el lead sigue en un estado a mano (también para gerencia)", async () => {
    estado.rol = "gerencia";
    expect(await cambiarEstado(LEAD, "nuevo")).toEqual({ ok: true });
    expect(estado.filtroEstado).toEqual(["nuevo", "contactado", "perdido"]);
    estado.filas = [];
    expect((await cambiarEstado(LEAD, "nuevo")).ok).toBe(false);
  });

  it("el asesor no puede asignar leads", async () => {
    const r = await asignarAsesor(LEAD, OTRO);
    expect(r).toEqual({ ok: false, error: "Solo gerencia puede asignar leads." });
    expect(estado.escrituras).toEqual([]);
  });

  it("gerencia asigna y puede dejar el lead sin asesor", async () => {
    estado.rol = "gerencia";
    expect(await asignarAsesor(LEAD, OTRO)).toEqual({ ok: true });
    expect(await asignarAsesor(LEAD, null)).toEqual({ ok: true });
    expect((await asignarAsesor(LEAD, "no-es-uuid")).ok).toBe(false);
    expect(estado.escrituras.map((e) => e.datos)).toEqual([{ asesor_id: OTRO }, { asesor_id: null }]);
  });

  it("un lead ajeno (la base no devuelve filas) se reporta como no encontrado", async () => {
    estado.filas = [];
    expect((await cambiarEstado(LEAD, "perdido")).ok).toBe(false);
    expect(await ponerProximoContacto(LEAD, null)).toEqual({ ok: false, error: "No encontramos ese lead o no es tuyo." });
  });

  it("si la base rechaza el cambio, el mensaje es simple", async () => {
    estado.error = { code: "42501" };
    expect(await cambiarEstado(LEAD, "nuevo")).toEqual({ ok: false, error: "Ese cambio solo lo hace gerencia o el sistema." });
  });

  it("valida el id y la fecha antes de escribir", async () => {
    expect((await cambiarEstado("../x", "nuevo")).ok).toBe(false);
    expect((await ponerProximoContacto(LEAD, "2026-11-01")).ok).toBe(false);
    expect(estado.escrituras).toEqual([]);
    expect(await ponerProximoContacto(LEAD, "2026-12-01")).toEqual({ ok: true });
    expect(await ponerProximoContacto(LEAD, null)).toEqual({ ok: true });
    expect(estado.escrituras.map((e) => e.datos)).toEqual([{ proximo_contacto: "2026-12-01" }, { proximo_contacto: null }]);
  });

  it("la nota va a nombre de quien la escribe, de tipo nota y limpia", async () => {
    expect(await agregarNota(LEAD, "  Llamé  ")).toEqual({ ok: true });
    expect((await agregarNota(LEAD, "   ")).ok).toBe(false);
    expect(estado.escrituras).toEqual([
      {
        tabla: "actividades",
        tipo: "insert",
        datos: { lead_id: LEAD, autor_id: "00000000-0000-4000-a000-00000000000a", tipo: "nota", detalle: "Llamé" },
      },
    ]);
  });

  it("una nota en un lead ajeno (RLS) se reporta como no encontrado", async () => {
    estado.error = { code: "42501" };
    expect(await agregarNota(LEAD, "x")).toEqual({ ok: false, error: "No encontramos ese lead o no es tuyo." });
  });
});
