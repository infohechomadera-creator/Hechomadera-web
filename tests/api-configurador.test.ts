/** API pública del configurador con Supabase simulado. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { calcularRango } from "@/lib/precios/calcular";
import { AUTORIZACION_VERSION } from "@/lib/configurador/autorizacion";

// Base simulada en memoria.
const base = { clientes: [] as Record<string, unknown>[], leads: [] as Record<string, unknown>[], archivos: [] as unknown[], subidas: [] as string[], borradas: [] as string[] };
let fallarEnSubida = 0; // 0 = nunca; n = falla la subida número n
let subidasHechas = 0;
let fallarArchivos = false;
let carrera = false;
const bloqueados = new Set<string>();
let n = 0;
const nuevoId = () => `00000000-0000-4000-a000-${String(++n).padStart(12, "0")}`;

vi.mock("@/lib/precios/fuente", () => ({ obtenerPrecios: async () => ({ tablas: PRECIOS_EJEMPLO }) }));
const aviso = vi.hoisted(() => ({ llamadas: 0 }));
vi.mock("@/lib/email-notifications", () => ({ sendNewLeadAlertToSeller: async () => void aviso.llamadas++ }));
vi.mock("@/lib/limite", () => ({
  ipDe: () => "203.0.113.9",
  dentroDelLimite: async (nombre: string) => ![...bloqueados].some((b) => nombre.startsWith(b)),
}));
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
          if (tabla === "archivos" && fallarArchivos) {
            const r = { error: { message: "x" }, data: null };
            return Object.assign(Promise.resolve(r), { select: () => ({ single: async () => r }) });
          }
          if (tabla === "leads" && carrera) {
            // Otro envío igual llegó primero.
            base.leads.push({ ...filas[0], id: "99999999-0000-4000-a000-000000000999", cliente_id: "otro-cliente", rango_min: 1, rango_max: 2 });
            const r = { error: { code: "23505", message: "duplicate" }, data: null };
            return Object.assign(Promise.resolve(r), { select: () => ({ single: async () => r }) });
          }
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
        upload: async (ruta: string) =>
          ++subidasHechas === fallarEnSubida ? { error: { message: "x" } } : (base.subidas.push(ruta), { error: null }),
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
    fallarEnSubida = 0;
    subidasHechas = 0;
    fallarArchivos = false;
    carrera = false;
    bloqueados.clear();
    aviso.llamadas = 0;
  });

  it("guarda cliente, lead y fotos con el rango del servidor (ignora montos del navegador)", async () => {
    const r = await enviar(
      datos({ rango_min: 1, rango_max: 2, configuracion: { ...config, rango_min: 1, rango_max: 2, rango: { min: 1, max: 2 } } }),
      [jpeg(), jpeg()],
    );
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.rango).toMatchObject({ min: esperado.min, max: esperado.max });
    expect(base.leads[0]).toMatchObject({ rango_min: esperado.min, rango_max: esperado.max });
    expect(base.clientes[0]).toMatchObject({ nombre: "Luis", autorizacion_version: AUTORIZACION_VERSION });
    expect(base.subidas).toHaveLength(2);
    expect(base.archivos).toHaveLength(2);
    expect(base.subidas[0]).toMatch(new RegExp(`^${base.leads[0].id}/[0-9a-f-]{36}\\.jpg$`));
    expect(JSON.stringify(base.leads[0].configuracion)).not.toContain("rango");
    expect(aviso.llamadas).toBe(1);
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

  it("si falla la segunda foto, borra la primera y no crea cliente ni lead", async () => {
    fallarEnSubida = 2;
    const r = await enviar(datos(), [jpeg(), jpeg()]);
    expect(r.status).toBe(500);
    expect(base.borradas).toEqual(base.subidas);
    expect(base.borradas).toHaveLength(1);
    expect(base.clientes).toHaveLength(0);
    expect(base.leads).toHaveLength(0);
    expect(aviso.llamadas).toBe(0);
  });

  it("si falla el registro de las fotos, borra fotos, cliente y lead", async () => {
    fallarArchivos = true;
    const r = await enviar(datos(), [jpeg()]);
    expect(r.status).toBe(500);
    expect(base.borradas).toHaveLength(1);
    expect(base.clientes).toHaveLength(0);
    expect(base.leads).toHaveLength(0);
  });

  it("si otro envío igual gana la carrera, devuelve ese lead y su rango guardado", async () => {
    carrera = true;
    const cuerpo = await (await enviar(datos())).json();
    expect(cuerpo.referencia).toBe("99999999");
    expect(cuerpo.rango).toMatchObject({ min: 1, max: 2 });
    expect(base.clientes).toHaveLength(0);
  });

  it("límite: demasiados intentos o envíos responden 429 sin guardar", async () => {
    bloqueados.add("config-intento");
    expect((await enviar(datos())).status).toBe(429);
    bloqueados.clear();
    bloqueados.add("config-lead:203.0.113.9");
    expect((await enviar(datos())).status).toBe(429);
    expect(base.clientes).toHaveLength(0);
  });

  it("si se pasa el cupo global de fotos, el lead se guarda igual pero sin fotos", async () => {
    bloqueados.add("config-fotos:global");
    const r = await enviar(datos(), [jpeg()]);
    expect(r.status).toBe(200);
    expect(base.leads).toHaveLength(1);
    expect(base.subidas).toHaveLength(0);
  });

  it("un envío con errores no gasta el cupo estricto", async () => {
    bloqueados.add("config-lead:");
    const r = await enviar(datos({ contacto: { nombre: "", telefono: "1" } }));
    expect(r.status).toBe(400);
  });

  it("un envío repetido devuelve el mismo lead sin crear otro", async () => {
    const a = await (await enviar(datos())).json();
    // Cambia el rango guardado: el reintento debe devolver lo guardado, no un cálculo nuevo.
    base.leads[0].rango_min = 111;
    base.leads[0].rango_max = 222;
    bloqueados.add("config-lead:"); // y no debe gastar cupo
    const b = await (await enviar(datos())).json();
    expect(b.referencia).toBe(a.referencia);
    expect(b.rango).toMatchObject({ min: 111, max: 222 });
    expect(base.leads).toHaveLength(1);
    expect(aviso.llamadas).toBe(1);
  });
});
