/** Límites de la API de precios para Operflow: por IP antes de la clave, y por clave (contador en Supabase). */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { LIMITE_IP_POR_MINUTO, LIMITE_POR_MINUTO } from "@/lib/integracion/operflow";

const eventos: unknown[] = [];
const contadores = new Map<string, number>();

vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    // Imita contar_intento(): suma uno por clave y dice si queda cupo.
    rpc: async (fn: string, a: { p_clave: string; p_limite: number }) => {
      if (fn !== "contar_intento") return { data: null, error: { code: "x" } };
      const n = (contadores.get(a.p_clave) ?? 0) + 1;
      contadores.set(a.p_clave, n);
      return { data: n <= a.p_limite, error: null };
    },
    from: (tabla: string) => {
      if (tabla === "eventos_integracion") {
        return { insert: async (e: unknown) => (eventos.push(e), { error: null }) };
      }
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: { id: "v1", datos: PRECIOS_EJEMPLO["Santa Marta"] }, error: null }),
      };
      return q;
    },
  }),
}));

const CLAVE = "clave-de-prueba-larga-0123456789";
const pedir = async (ip: string, auth: string) => {
  const { GET } = await import("@/app/api/integraciones/precios/route");
  return GET(
    new Request("http://local/api/integraciones/precios?ciudad=Santa%20Marta", {
      headers: { authorization: auth, "x-forwarded-for": `${ip}, 10.0.0.1` },
    }),
  );
};

describe("límites de /api/integraciones/precios", () => {
  beforeAll(() => {
    vi.stubEnv("OPERFLOW_API_KEY", CLAVE);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.prueba.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publica-de-prueba");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secreta-de-prueba");
  });

  it("quien intenta adivinar la clave queda frenado por IP y deja de escribir en el registro", async () => {
    for (let i = 0; i < LIMITE_IP_POR_MINUTO; i++) {
      expect((await pedir("203.0.113.7", "Bearer mala")).status).toBe(401);
    }
    const antes = eventos.length;
    const r = await pedir("203.0.113.7", `Bearer ${CLAVE}`);
    expect(r.status).toBe(429);
    expect(eventos.length).toBe(antes);
  });

  it("con la clave correcta, el límite por clave responde 429 y queda registrado", async () => {
    for (let i = 0; i < LIMITE_POR_MINUTO; i++) {
      expect((await pedir(`198.51.100.${i}`, `bearer ${CLAVE}`)).status).toBe(200);
    }
    const antes = eventos.length;
    expect((await pedir("198.51.100.250", `Bearer ${CLAVE}`)).status).toBe(429);
    expect(eventos.length).toBe(antes + 1);
  });
});

describe("el contador no guarda la IP", () => {
  it("la clave que llega a la base es una huella, no contiene la IP", () => {
    for (const clave of contadores.keys()) {
      expect(clave).toMatch(/^[0-9a-f]{64}$/);
      expect(clave).not.toContain("203.0.113.7");
    }
  });
});
