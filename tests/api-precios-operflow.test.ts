import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";

// Base simulada: devuelve una fila de precios_vigentes según la ciudad pedida.
const filas: Record<string, { id: string; datos: unknown } | null> = {
  "Santa Marta": { id: "version-sm-1", datos: PRECIOS_EJEMPLO["Santa Marta"] },
  Barranquilla: null,
};
const eventos: unknown[] = [];

vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    from: (tabla: string) => {
      if (tabla === "eventos_integracion") {
        return { insert: async (e: unknown) => (eventos.push(e), { error: null }) };
      }
      let ciudad = "";
      const q = {
        select: () => q,
        eq: (_c: string, v: string) => ((ciudad = v), q),
        maybeSingle: async () => ({ data: filas[ciudad] ?? null, error: null }),
      };
      return q;
    },
  }),
}));

const CLAVE = "clave-de-prueba-larga-0123456789";
const pedir = async (ciudad: string, auth?: string) => {
  const { GET } = await import("@/app/api/integraciones/precios/route");
  const headers: Record<string, string> = auth ? { authorization: auth } : {};
  return GET(new Request(`http://local/api/integraciones/precios?ciudad=${encodeURIComponent(ciudad)}`, { headers }));
};

describe("GET /api/integraciones/precios (mensaje D)", () => {
  beforeEach(() => {
    eventos.length = 0;
    vi.stubEnv("OPERFLOW_API_KEY", CLAVE);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sin clave configurada responde 503", async () => {
    vi.stubEnv("OPERFLOW_API_KEY", "");
    expect((await pedir("Santa Marta", `Bearer ${CLAVE}`)).status).toBe(503);
  });

  it("clave incorrecta o ausente: 401, y queda registrado", async () => {
    expect((await pedir("Santa Marta", "Bearer otra")).status).toBe(401);
    expect((await pedir("Santa Marta")).status).toBe(401);
    expect(eventos).toHaveLength(2);
    expect(JSON.stringify(eventos)).not.toContain(CLAVE);
  });

  it("ciudad no válida: 400 con el campo", async () => {
    const r = await pedir("Bogotá", `Bearer ${CLAVE}`);
    expect(r.status).toBe(400);
    expect((await r.json()).campos).toEqual(["ciudad"]);
  });

  it("ciudad válida con precios: 200 con versión y vigencia", async () => {
    const r = await pedir("Santa Marta", `Bearer ${CLAVE}`);
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo).toMatchObject({ ciudad: "Santa Marta", version_id: "version-sm-1", moneda: "COP" });
    expect(cuerpo.metro_lineal.D1).toBe(PRECIOS_EJEMPLO["Santa Marta"].metro_lineal.D1);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("ciudad válida sin precios vigentes: 404", async () => {
    expect((await pedir("Barranquilla", `Bearer ${CLAVE}`)).status).toBe(404);
  });
});
