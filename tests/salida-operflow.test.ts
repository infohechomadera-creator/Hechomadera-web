/**
 * W5 · Bandeja de salida a Operflow con una base en memoria: dos procesos a la vez no envían el mismo
 * mensaje, un mensaje cancelado durante el envío no se pisa (y si el proyecto alcanzó a crearse, sale el
 * "borrar"), y sin conexión todo queda pendiente.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Fila = Record<string, unknown>;
const tablas: Record<string, Fila[]> = {};
let siguienteId = 100;

/** Base mínima en memoria con lo que usa lib/integracion/salida.ts (filtros eq, lte, in; select, update, insert). */
function consulta(tabla: string) {
  const filtros: ((f: Fila) => boolean)[] = [];
  let cambios: Fila | null = null;
  let nueva: Fila | null = null;
  let limite = Infinity;
  const q = {
    select: () => q,
    order: () => q,
    returns: () => q,
    limit: (n: number) => ((limite = n), q),
    eq: (c: string, v: unknown) => (filtros.push((f) => f[c] === v), q),
    lte: (c: string, v: string) => (filtros.push((f) => String(f[c]) <= v), q),
    in: (c: string, v: unknown[]) => (filtros.push((f) => v.includes(f[c])), q),
    update: (c: Fila) => ((cambios = c), q),
    insert: (f: Fila) => ((nueva = f), q),
    maybeSingle: async () => ({ data: correr().data?.[0] ?? null, error: null }),
    then: (ok: (v: unknown) => unknown) => ok(correr()),
  };
  function correr() {
    const filas = (tablas[tabla] ??= []);
    if (nueva) {
      const f = nueva as unknown as Fila;
      if (tabla === "mensajes_operflow" && filas.some((x) => x.lead_id === f.lead_id && x.mensaje === f.mensaje && f.mensaje !== "C")) {
        return { data: null, error: { code: "23505" } };
      }
      filas.push({ id: siguienteId++, estado: "pendiente", intentos: 0, proximo_intento_at: "2000-01-01", ...f });
      return { data: null, error: null };
    }
    const elegidas = filas.filter((f) => filtros.every((p) => p(f))).slice(0, limite);
    if (cambios) for (const f of elegidas) Object.assign(f, cambios);
    return { data: elegidas.map((f) => ({ ...f })), error: null };
  }
  return q;
}

vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    from: consulta,
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) },
  }),
}));
vi.mock("@/lib/integracion/operflow", () => ({ registrarEvento: async () => undefined }));

const LEAD = "20000000-0000-4000-a000-00000000000a";
let llamadas: string[] = [];
let alResponder: (() => void) | null = null;

beforeEach(() => {
  for (const k of Object.keys(tablas)) delete tablas[k];
  tablas.leads = [{ id: LEAD, producto: "cocina", ciudad: "Barranquilla", rango_min: 1, rango_max: 2, configuracion: {}, asesor_id: null, clientes: null, archivos: [] }];
  tablas.pagos = [];
  tablas.actividades = [];
  tablas.mensajes_operflow = [{ id: 1, lead_id: LEAD, mensaje: "A", pago_id: null, estado: "pendiente", intentos: 0, proximo_intento_at: "2000-01-01" }];
  llamadas = [];
  alResponder = null;
  vi.stubEnv("OPERFLOW_URL", "https://operflow.test");
  vi.stubEnv("OPERFLOW_API_KEY", "clave");
  vi.stubGlobal("fetch", async (url: string) => {
    llamadas.push(url);
    await new Promise((r) => setTimeout(r, 5));
    alResponder?.();
    return new Response(JSON.stringify({ proyecto_id: "p-1" }), { status: 201 });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("bandeja de salida a Operflow", () => {
  it("dos procesos a la vez envían el mensaje una sola vez", async () => {
    const { enviarPendientes } = await import("@/lib/integracion/salida");
    await Promise.all([enviarPendientes({ leadId: LEAD, forzar: true }), enviarPendientes({ leadId: LEAD, forzar: true }), enviarPendientes()]);
    expect(llamadas).toEqual(["https://operflow.test/api/v1/proyectos"]);
    expect(tablas.mensajes_operflow[0]).toMatchObject({ estado: "enviado", intentos: 1 });
    expect(tablas.leads[0].operflow_proyecto_id).toBe("p-1");
  });

  it("si se cancela mientras se envía, no se pisa y se pide borrar el proyecto que alcanzó a crearse", async () => {
    const { enviarPendientes } = await import("@/lib/integracion/salida");
    alResponder = () => Object.assign(tablas.mensajes_operflow[0], { estado: "cancelado" });
    await enviarPendientes({ leadId: LEAD });
    expect(tablas.mensajes_operflow[0].estado).toBe("cancelado");
    expect(tablas.mensajes_operflow.find((m) => m.mensaje === "E")).toMatchObject({ estado: "pendiente" });
  });

  it("sin OPERFLOW_URL no llama a nadie y deja el mensaje pendiente con el motivo", async () => {
    vi.stubEnv("OPERFLOW_URL", "");
    const { enviarPendientes, SIN_CONEXION } = await import("@/lib/integracion/salida");
    const r = await enviarPendientes({ leadId: LEAD });
    expect(r.conectado).toBe(false);
    expect(llamadas).toHaveLength(0);
    expect(tablas.mensajes_operflow[0]).toMatchObject({ estado: "pendiente", ultimo_error: SIN_CONEXION });
  });

  it("un pago (C) no sale antes de que el proyecto (A) exista en Operflow", async () => {
    tablas.mensajes_operflow = [{ id: 2, lead_id: LEAD, mensaje: "C", pago_id: 9, estado: "pendiente", intentos: 0, proximo_intento_at: "2000-01-01" }];
    const { enviarPendientes } = await import("@/lib/integracion/salida");
    await enviarPendientes({ leadId: LEAD });
    expect(llamadas).toHaveLength(0);
  });
});
