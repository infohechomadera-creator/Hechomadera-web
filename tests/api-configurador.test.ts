/** API pública del configurador con Supabase simulado. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { calcularRango } from "@/lib/precios/calcular";
import { AUTORIZACION_VERSION } from "@/lib/configurador/autorizacion";

// Base simulada en memoria.
const base = { clientes: [] as Record<string, unknown>[], leads: [] as Record<string, unknown>[], archivos: [] as unknown[], subidas: [] as string[], borradas: [] as string[] };
let fallarSubida = false;
let n = 0;
const nuevoId = () => `00000000-0000-4000-a000-${String(++n).padStart(12, "0")}`;

vi.mock("@/lib/precios/fuente", () => ({ obtenerPrecios: async () => ({ tablas: PRECIOS_EJEMPLO }) }));
vi.mock("@/lib/email-notifications", () => ({ sendNewLeadAlertToSeller: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    from: (tabla: "clientes" | "leads" | "archivos") => {
      let filtro: [string, unknown] | null = null;
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => ((filtro = [c, v]), q),
        maybeSingle: async () => ({ data: (base[tabla] as Record<string, unknown>[]).find((f) => filtro && f[filtro[0]] === filtro[1]) ?? null, error: null }),
        insert: (fila: Record<string, unknown> | Record<string, unknown>[]) => {
          const filas = (Array.isArray(fila) ? fila : [fila]).map((f) => ({ id: nuevoId(), ...f }));
          (base[tabla] as unknown[]).push(...filas);
          const r = { error: null, data: filas[0] };
          return Object.assign(Promise.resolve(r), { select: () => ({ single: async () => r }) });
        },
        delete: () => ({
          eq: async (_c: string, id: string) => {
            base.clientes = base.clientes.filter((c) => c.id !== id);
            base.leads = base.leads.filter((l) => l.cliente_id !== id);
            return { error: null };
          },
        }),
      };
      return q;
    },
    storage: {
      from: () => ({
        upload: async (ruta: string) => (fallarSubida ? { error: { message: "x" } } : (base.subidas.push(ruta), { error: null })),
        remove: async (rutas: string[]) => (base.borradas.push(...rutas), { error: null }),
      }),
    },
  }),
}));

const config = { ciudad: "Santa Marta", forma: "U", diseno: "D2", color: "color", herrajes: "alta", electrodomesticos: ["campana"], medidas_mm: { pared_a: 3000, pared_b: 2000, pared_c: 2000 } };
const datos = (extra: object = {}) => ({
  configuracion: config,
  contacto: { nombre: "Luis", telefono: "3009998877" },
  autorizacion: { acepta: true, version: AUTORIZACION_VERSION },
  envio_id: "4b6f9c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  ...extra,
});
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], "a.jpg", { type: "image/jpeg" });

async function enviar(d: object, fotos: File[] = [], trampa = "") {
  const { POST } = await import("@/app/api/configurador/lead/route");
  const form = new FormData();
  form.set("datos", JSON.stringify(d));
  for (const f of fotos) form.append("fotos", f);
  if (trampa) form.set("sitio_web", trampa);
  return POST(new Request("http://local/api/configurador/lead", { method: "POST", body: form }));
}

const esperado = calcularRango(PRECIOS_EJEMPLO["Santa Marta"], config as never);

describe("POST /api/configurador/rango", () => {
  it("calcula el rango en el servidor", async () => {
    const { POST } = await import("@/app/api/configurador/rango/route");
    const r = await POST(new Request("http://local", { method: "POST", body: JSON.stringify(config) }));
    expect(r.status).toBe(200);
    expect((await r.json()).rango).toMatchObject({ min: esperado.min, max: esperado.max });
  });
  it("una medida fuera de rango responde 400 con el campo", async () => {
    const { POST } = await import("@/app/api/configurador/rango/route");
    const r = await POST(new Request("http://local", { method: "POST", body: JSON.stringify({ ...config, medidas_mm: { pared_a: 100, pared_b: 2000, pared_c: 2000 } }) }));
    expect(r.status).toBe(400);
    expect((await r.json()).campo).toBe("pared_a");
  });
});

describe("POST /api/configurador/lead", () => {
  beforeEach(() => {
    base.clientes = [];
    base.leads = [];
    base.archivos = [];
    base.subidas = [];
    base.borradas = [];
    fallarSubida = false;
  });

  it("guarda cliente, lead y fotos con el rango del servidor (ignora montos del navegador)", async () => {
    const r = await enviar(datos({ rango_min: 1, rango_max: 2 }), [jpeg(), jpeg()]);
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.rango).toMatchObject({ min: esperado.min, max: esperado.max });
    expect(base.leads[0]).toMatchObject({ rango_min: esperado.min, rango_max: esperado.max });
    expect(base.clientes[0]).toMatchObject({ nombre: "Luis", autorizacion_version: AUTORIZACION_VERSION });
    expect(base.subidas).toHaveLength(2);
    expect(base.archivos).toHaveLength(2);
    expect(base.subidas[0]).toMatch(new RegExp(`^${base.leads[0].id}/[0-9a-f-]{36}\\.jpg$`));
  });

  it("sin autorización no guarda nada", async () => {
    const r = await enviar(datos({ autorizacion: { acepta: false, version: AUTORIZACION_VERSION } }));
    expect(r.status).toBe(400);
    expect(base.clientes).toHaveLength(0);
  });

  it("la trampa anti-bots responde bien pero no guarda", async () => {
    const r = await enviar(datos(), [], "http://spam");
    expect(r.status).toBe(200);
    expect(base.clientes).toHaveLength(0);
  });

  it("un archivo que no es imagen se rechaza", async () => {
    const r = await enviar(datos(), [new File(["hola"], "x.jpg", { type: "image/jpeg" })]);
    expect(r.status).toBe(400);
    expect(base.clientes).toHaveLength(0);
  });

  it("si falla la subida de una foto, borra lo creado", async () => {
    fallarSubida = true;
    const r = await enviar(datos(), [jpeg()]);
    expect(r.status).toBe(500);
    expect(base.clientes).toHaveLength(0);
    expect(base.leads).toHaveLength(0);
  });

  it("un envío repetido devuelve el mismo lead sin crear otro", async () => {
    const a = await (await enviar(datos())).json();
    const b = await (await enviar(datos())).json();
    expect(b.referencia).toBe(a.referencia);
    expect(base.leads).toHaveLength(1);
  });
});
