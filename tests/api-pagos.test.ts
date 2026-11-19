/**
 * W5 · Rutas de pagos y de Operflow con Mercado Pago y la base simulados.
 * Lo importante: el monto lo da la API de Mercado Pago (no el aviso), los errores pasajeros
 * piden reintento (500), los avisos de Operflow sin firma se rechazan y el navegador nunca fija precios.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import products from "@/content/products.json";
import { firmarOperflow } from "@/lib/integracion/firma";

const llamadas = { rpc: [] as { fn: string; args: Record<string, unknown> }[], inserts: [] as { tabla: string; fila: unknown }[] };
let respuestaRpc: { data: unknown; error: unknown } = { data: { ok: true }, error: null };
let pagoMP: { ok: true; payment: Record<string, unknown> } | { ok: false; status: number; error: string };
const enviarPendientes = vi.fn(async () => ({ enviados: 0, pendientes: 1, fallidos: 0, conectado: false }));
const crearPreferencia = vi.fn(async () => ({ ok: true as const, preferenciaId: "pref-1", url: "https://mp.test/pagar" }));

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/mercadopago", async (orig) => ({
  ...(await orig<typeof import("@/lib/mercadopago")>()),
  fetchMercadoPagoPayment: async () => pagoMP,
}));
vi.mock("@/lib/integracion/salida", () => ({ enviarPendientes }));
vi.mock("@/lib/pagos/preferencia", () => ({ crearPreferencia }));
vi.mock("@/lib/email-notifications", () => ({
  avisarPagoLead: vi.fn(async () => undefined),
  avisarPagoParaRevisar: vi.fn(async () => undefined),
  sendPaymentConfirmationToBuyer: vi.fn(async () => undefined),
  sendNewOrderAlertToSeller: vi.fn(async () => undefined),
}));
const sesion = vi.hoisted(() => ({ rol: null as string | null }));
vi.mock("@/lib/sesion", () => ({
  exigirGerencia: async () => (sesion.rol === "gerencia" ? null : new Response(null, { status: 401 })),
  rolActual: async () => sesion.rol,
}));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteSistema: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => (llamadas.rpc.push({ fn, args }), respuestaRpc),
    from: (tabla: string) => {
      const q: Record<string, unknown> = {
        insert: async (fila: unknown) => (llamadas.inserts.push({ tabla, fila }), { error: null }),
        update: () => q,
        delete: () => q,
        select: () => q,
        eq: () => q,
        is: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (r: (v: unknown) => unknown) => r({ data: null, error: null }),
      };
      return q;
    },
  }),
}));

const aviso = (cuerpo: object, headers: Record<string, string> = {}) =>
  new Request("http://local/api/payments/mercadopago/webhook", { method: "POST", body: JSON.stringify(cuerpo), headers });

beforeEach(() => {
  llamadas.rpc.length = 0;
  llamadas.inserts.length = 0;
  enviarPendientes.mockClear();
  crearPreferencia.mockClear();
  respuestaRpc = { data: { ok: true, nuevo_aprobado: false }, error: null };
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("MERCADOPAGO_WEBHOOK_ENFORCE", "");
  vi.stubEnv("VERCEL_ENV", "production");
  sesion.rol = null;
});
afterEach(() => vi.unstubAllEnvs());

describe("webhook de Mercado Pago", () => {
  it("usa el monto y la orden que dice la API de Mercado Pago, no el aviso", async () => {
    pagoMP = { ok: true, payment: { id: 555, status: "approved", external_reference: "ord_abc123", transaction_amount: 300000, currency_id: "COP" } };
    respuestaRpc = { data: { ok: true, nuevo_aprobado: true, tipo: "diseno", lead_id: "lead-1" }, error: null };
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    const r = await POST(aviso({ type: "payment", data: { id: "555" }, transaction_amount: 1 }));
    expect(r.status).toBe(200);
    expect(llamadas.rpc[0]).toMatchObject({ fn: "registrar_pago", args: { p_orden_id: "ord_abc123", p_mp_pago_id: 555, p_monto: 300000, p_moneda: "COP" } });
    expect(enviarPendientes).toHaveBeenCalledWith({ leadId: "lead-1" });
    expect(llamadas.inserts.find((i) => i.tabla === "eventos_pago")).toBeTruthy();
  });

  it("si Mercado Pago o la base fallan de forma pasajera, responde 500 para que reintente", async () => {
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    pagoMP = { ok: false, status: 502, error: "caído" };
    expect((await POST(aviso({ type: "payment", data: { id: "556" } }))).status).toBe(500);
    pagoMP = { ok: true, payment: { id: 556, status: "approved", external_reference: "ord_abc123", transaction_amount: 1, currency_id: "COP" } };
    respuestaRpc = { data: null, error: { code: "57014" } };
    expect((await POST(aviso({ type: "payment", data: { id: "556" } }))).status).toBe(500);
  });

  it("un pago que no existe o sin orden nuestra se registra y responde 200 sin tocar la base", async () => {
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    pagoMP = { ok: false, status: 404, error: "no existe" };
    expect((await POST(aviso({ type: "payment", data: { id: "557" } }))).status).toBe(200);
    pagoMP = { ok: true, payment: { id: 557, status: "approved", external_reference: "tienda-vieja" } };
    expect((await POST(aviso({ type: "payment", data: { id: "557" } }))).status).toBe(200);
    expect(llamadas.rpc).toHaveLength(0);
  });

  it("otros eventos o ids raros no consultan nada", async () => {
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    expect((await POST(aviso({ type: "merchant_order", data: { id: "1" } }))).status).toBe(200);
    expect((await POST(aviso({ type: "payment", data: { id: "abc" } }))).status).toBe(200);
    expect(llamadas.rpc).toHaveLength(0);
  });

  it("con la firma obligatoria, un aviso sin firma se rechaza", async () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_ENFORCE", "true");
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "s");
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    expect((await POST(aviso({ type: "payment", data: { id: "558" } }))).status).toBe(401);
  });
});

describe("cobro de la tienda", () => {
  const pedir = async (body: object) => {
    const { POST } = await import("@/app/api/payments/mercadopago/preference/route");
    return POST(new Request("http://local/api/payments/mercadopago/preference", { method: "POST", body: JSON.stringify(body) }));
  };

  it("el precio sale del catálogo del servidor aunque el navegador mande otro", async () => {
    const p = (products as { id: string; priceCOP: number }[])[0];
    const r = await pedir({ producto: p.id, unit_price: 1, title: "x" });
    expect(r.status).toBe(200);
    const orden = llamadas.inserts.find((i) => i.tabla === "ordenes")?.fila as { total_cop: number; tipo: string };
    expect(orden).toMatchObject({ tipo: "tienda", total_cop: p.priceCOP });
  });

  it("producto desconocido o precio a mano: 400", async () => {
    expect((await pedir({ title: "Algo", unit_price: 1000 })).status).toBe(400);
    expect((await pedir({ producto: "no-existe" })).status).toBe(400);
    expect(crearPreferencia).not.toHaveBeenCalled();
  });

  it("la prueba de pago es solo para gerencia", async () => {
    expect((await pedir({ prueba: true })).status).toBe(401);
  });
});

describe("enlace de pago del lead", () => {
  it("un código que no tiene la forma correcta: 404 sin tocar la base", async () => {
    const { POST } = await import("@/app/api/pagos/lead/route");
    const r = await POST(new Request("http://local/api/pagos/lead", { method: "POST", body: JSON.stringify({ token: "123" }) }));
    expect(r.status).toBe(404);
    expect(llamadas.rpc).toHaveLength(0);
  });
});

describe("avisos de Operflow (mensaje B)", () => {
  const SECRETO = "secreto-operflow-prueba";
  const LEAD = "20000000-0000-4000-a000-00000000000a";
  const enviar = async (cuerpo: object, firma?: string) => {
    const { POST } = await import("@/app/api/integraciones/operflow/route");
    const texto = JSON.stringify(cuerpo);
    const headers: Record<string, string> = {};
    if (firma !== undefined) headers["x-operflow-firma"] = firma || firmarOperflow(texto, SECRETO, Math.floor(Date.now() / 1000));
    return POST(new Request("http://local/api/integraciones/operflow", { method: "POST", body: texto, headers }));
  };
  beforeEach(() => vi.stubEnv("OPERFLOW_WEBHOOK_SECRET", SECRETO));

  it("sin secreto configurado: 503", async () => {
    vi.stubEnv("OPERFLOW_WEBHOOK_SECRET", "");
    expect((await enviar({ evento: "entregado" }, "")).status).toBe(503);
  });

  it("sin firma o con firma falsa: 401 y no toca la base", async () => {
    expect((await enviar({ evento: "entregado", id_externo: `lead_${LEAD}` })).status).toBe(401);
    expect((await enviar({ evento: "entregado", id_externo: `lead_${LEAD}` }, `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`)).status).toBe(401);
    expect(llamadas.rpc).toHaveLength(0);
  });

  it("firmado y válido: lo registra la base", async () => {
    const r = await enviar(
      { evento: "propuesta_lista", id_externo: `lead_${LEAD}`, proyecto_id: "p-1", etapa: "propuesta", datos: { valor_final: 18000000, url_propuesta: "https://o.test/p" } },
      "",
    );
    expect(r.status).toBe(200);
    expect(llamadas.rpc[0]).toMatchObject({
      fn: "registrar_aviso_operflow",
      args: { p_lead: LEAD, p_evento: "propuesta_lista", p_valor_final: 18000000, p_url_propuesta: "https://o.test/p" },
    });
    expect(llamadas.rpc[0].args.p_huella).toMatch(/^[0-9a-f]{64}$/);
  });

  it("evento, id o valor inválidos: 400 con los campos", async () => {
    const r = await enviar({ evento: "otro", id_externo: "lead_x", datos: { valor_final: -1 } }, "");
    expect(r.status).toBe(400);
    expect((await r.json()).campos).toEqual(["evento", "id_externo", "datos.valor_final"]);
  });
});

describe("refuerzo: dinero real solo en producción, y la vista previa solo para gerencia", () => {
  it("en producción un pago de PRUEBA no toca la base y se avisa", async () => {
    pagoMP = { ok: true, payment: { id: 900, status: "approved", external_reference: "ord_abc123", transaction_amount: 300000, currency_id: "COP", live_mode: false } };
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    expect((await POST(aviso({ type: "payment", data: { id: "900" } }))).status).toBe(200);
    expect(llamadas.rpc).toHaveLength(0);
    const { avisarPagoParaRevisar } = await import("@/lib/email-notifications");
    expect(avisarPagoParaRevisar).toHaveBeenCalledWith(expect.objectContaining({ alerta: "prueba_en_produccion", mpPagoId: 900 }));
  });

  it("un pago real marca en la base si fue de prueba o no", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    pagoMP = { ok: true, payment: { id: 901, status: "approved", external_reference: "ord_abc123", transaction_amount: 300000, currency_id: "COP", live_mode: false } };
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    await POST(aviso({ type: "payment", data: { id: "901" } }));
    expect(llamadas.rpc[0].args).toMatchObject({ p_modo_prueba: true });
  });

  it("un pago aprobado sin orden nuestra avisa a gerencia", async () => {
    pagoMP = { ok: true, payment: { id: 902, status: "approved", external_reference: "algo-raro", transaction_amount: 5000, currency_id: "COP", live_mode: true } };
    const { POST } = await import("@/app/api/payments/mercadopago/webhook/route");
    await POST(aviso({ type: "payment", data: { id: "902" } }));
    const { avisarPagoParaRevisar } = await import("@/lib/email-notifications");
    expect(avisarPagoParaRevisar).toHaveBeenCalledWith(expect.objectContaining({ alerta: "sin_orden", mpPagoId: 902 }));
  });

  it("fuera de producción, sin sesión de gerencia no se inicia ningún cobro", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const tienda = await import("@/app/api/payments/mercadopago/preference/route");
    const p = (products as { id: string }[])[0];
    const r1 = await tienda.POST(new Request("http://local/x", { method: "POST", body: JSON.stringify({ producto: p.id }) }));
    expect(r1.status).toBe(403);
    const lead = await import("@/app/api/pagos/lead/route");
    const r2 = await lead.POST(new Request("http://local/x", { method: "POST", body: JSON.stringify({ token: "a".repeat(64) }) }));
    expect(r2.status).toBe(403);
    expect(crearPreferencia).not.toHaveBeenCalled();
  });
});
