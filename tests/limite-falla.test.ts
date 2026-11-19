/** `dentroDelLimite`: qué responde cuando no se puede contar (Supabase sin configurar o caído). */
import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => ({ falla: false }));
vi.mock("@/lib/supabase/config", () => ({ supabaseConfigurado: () => true }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    rpc: async () => (rpc.falla ? { data: null, error: { message: "caída" } } : { data: true, error: null }),
  }),
}));

import { dentroDelLimite } from "@/lib/limite";

describe("dentroDelLimite si no se puede contar", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    rpc.falla = false;
  });

  it("por defecto deja pasar; con siFalla=false (agente de IA) no", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "x");
    rpc.falla = true;
    expect(await dentroDelLimite("a", 1, 60)).toBe(true);
    expect(await dentroDelLimite("a", 1, 60, false)).toBe(false);
  });

  it("sin llave del servidor: igual", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(await dentroDelLimite("a", 1, 60)).toBe(true);
    expect(await dentroDelLimite("a", 1, 60, false)).toBe(false);
  });

  it("cuando sí se puede contar, responde lo de la base", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "x");
    expect(await dentroDelLimite("a", 1, 60, false)).toBe(true);
  });
});
