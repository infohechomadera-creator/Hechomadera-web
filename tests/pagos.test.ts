/**
 * W5 · Cobros por lead: cálculo de montos (servidor), firma de los avisos de Operflow (mensaje B),
 * cuerpo del mensaje A y qué hacer con cada respuesta de Operflow.
 */
import { describe, expect, it } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { montoAnticipo, montoSaldo, siguienteCobro, sumarPagado, type LeadParaCobro } from "@/lib/pagos/calcular";
import { firmaOperflowValida, firmarOperflow } from "@/lib/integracion/firma";
import { cuerpoA, decidir, idExterno, referenciaPago } from "@/lib/integracion/salida";

const tabla = PRECIOS_EJEMPLO.Barranquilla;
const base: LeadParaCobro = {
  producto: "cocina",
  pago_estado: "nada",
  estado: "contactado",
  valor_final: null,
  valor_final_medido: null,
  operflow_estado: null,
  datos_borrados: false,
};
const nada = { diseno: 0, anticipo: 0, saldo: 0 };

describe("siguiente cobro", () => {
  it("primero el diseño, con el precio fijo de la tabla", () => {
    expect(siguienteCobro(base, tabla, nada)).toEqual({ ok: true, tipo: "diseno", monto: tabla.valor_diseno.cocina });
    expect(tabla.valor_diseno.cocina).toBe(300000);
  });

  it("después del diseño espera el valor final de la propuesta", () => {
    const pagoDiseno = { ...nada, diseno: 300000 };
    expect(siguienteCobro({ ...base, pago_estado: "diseno" }, tabla, pagoDiseno)).toEqual({ ok: false, motivo: "espera_propuesta" });
  });

  it("anticipo = 35% del valor final − diseño pagado", () => {
    const pagoDiseno = { ...nada, diseno: 300000 };
    const r = siguienteCobro({ ...base, pago_estado: "diseno", valor_final: 20_000_000 }, tabla, pagoDiseno);
    expect(r).toEqual({ ok: true, tipo: "anticipo", monto: 6_700_000 });
    expect(montoAnticipo(20_000_000, 35, 300000)).toBe(6_700_000);
    expect(montoAnticipo(1_234_567, 35, 0)).toBe(432_098); // redondeo al peso
  });

  it("saldo = valor medido − (diseño + anticipo), sin tolerancia", () => {
    const pagado = { diseno: 300000, anticipo: 6_700_000, saldo: 0 };
    expect(siguienteCobro({ ...base, pago_estado: "anticipo", valor_final: 20_000_000 }, tabla, pagado)).toEqual({ ok: false, motivo: "espera_medidas" });
    const r = siguienteCobro({ ...base, pago_estado: "anticipo", valor_final: 20_000_000, valor_final_medido: 21_000_000 }, tabla, pagado);
    expect(r).toEqual({ ok: true, tipo: "saldo", monto: 14_000_000 });
    expect(montoSaldo(21_000_000, pagado)).toBe(14_000_000);
  });

  it("si el valor medido no deja saldo, no se cobra", () => {
    const pagado = { diseno: 300000, anticipo: 6_700_000, saldo: 0 };
    expect(siguienteCobro({ ...base, pago_estado: "anticipo", valor_final_medido: 7_000_000 }, tabla, pagado)).toEqual({ ok: false, motivo: "sin_monto" });
  });

  it("pagado todo, no aprobó, datos borrados o cancelado: no hay cobro", () => {
    expect(siguienteCobro({ ...base, pago_estado: "saldo" }, tabla, nada)).toEqual({ ok: false, motivo: "pagado_todo" });
    expect(siguienteCobro({ ...base, estado: "no_aprobo" }, tabla, nada)).toEqual({ ok: false, motivo: "cerrado" });
    expect(siguienteCobro({ ...base, datos_borrados: true }, tabla, nada)).toEqual({ ok: false, motivo: "cerrado" });
    expect(siguienteCobro({ ...base, pago_estado: "anticipo", operflow_estado: "cancelado" }, tabla, nada)).toEqual({ ok: false, motivo: "cerrado" });
  });

  it("solo suman los pagos que cuentan", () => {
    expect(
      sumarPagado([
        { tipo: "diseno", monto: 300000, cuenta: true },
        { tipo: "diseno", monto: 300000, cuenta: false },
        { tipo: "anticipo", monto: 100, cuenta: true },
      ]),
    ).toEqual({ diseno: 300000, anticipo: 100, saldo: 0 });
  });
});

describe("firma de Operflow (mensaje B)", () => {
  const secreto = "secreto-de-prueba";
  const cuerpo = '{"evento":"entregado"}';
  const t = 1_800_000_000;

  it("acepta la firma correcta dentro de 5 minutos", () => {
    expect(firmaOperflowValida(firmarOperflow(cuerpo, secreto, t), cuerpo, secreto, t + 60)).toEqual({ ok: true });
  });

  it("rechaza sin firma, sin secreto, vencida, con otro cuerpo u otro secreto", () => {
    expect(firmaOperflowValida(null, cuerpo, secreto, t)).toMatchObject({ ok: false });
    expect(firmaOperflowValida(firmarOperflow(cuerpo, secreto, t), cuerpo, undefined, t)).toMatchObject({ ok: false, motivo: "sin_secreto" });
    expect(firmaOperflowValida(firmarOperflow(cuerpo, secreto, t), cuerpo, secreto, t + 301)).toMatchObject({ ok: false, motivo: "vencida" });
    expect(firmaOperflowValida(firmarOperflow(cuerpo, secreto, t), '{"evento":"cancelado"}', secreto, t)).toMatchObject({ ok: false, motivo: "no_cuadra" });
    expect(firmaOperflowValida(firmarOperflow(cuerpo, "otro", t), cuerpo, secreto, t)).toMatchObject({ ok: false, motivo: "no_cuadra" });
    expect(firmaOperflowValida("t=abc,v1=zz", cuerpo, secreto, t)).toMatchObject({ ok: false, motivo: "formato" });
  });
});

describe("mensaje A y respuestas de Operflow", () => {
  const lead = {
    id: "20000000-0000-4000-a000-00000000000a",
    producto: "cocina",
    ciudad: "Santa Marta",
    rango_min: 10_000_000,
    rango_max: 14_000_000,
    configuracion: { forma: "L", diseno: "D3", color: "roble", herrajes: "estandar", electrodomesticos: ["estufa"], medidas_mm: { pared_a: 3200 } },
    clientes: { nombre: "Ana", telefono: "3000000001", email: null, direccion: null },
    asesor: { email: "asesor@prueba.test" },
  };

  it("arma el brief con los campos del contrato", () => {
    const c = cuerpoA(lead, ["https://firmada/1"], { valor: 300000, referencia: "mp_123", fecha: "2026-11-19T10:00:00Z" });
    expect(c.id_externo).toBe(`lead_${lead.id}`);
    expect(c.configuracion).toMatchObject({ forma: "L", diseno_base: "D3", colores: { cuerpos: "roble", frentes: "roble" } });
    expect(c.archivos).toEqual([{ tipo: "foto_espacio", url: "https://firmada/1" }]);
    expect(c.pago_diseno).toEqual({ valor: 300000, moneda: "COP", referencia: "mp_123", fecha: "2026-11-19T10:00:00Z" });
    expect(c.cliente.email).toBe("");
    expect(idExterno(lead.id)).toBe(c.id_externo);
  });

  it("referencia del pago: de Mercado Pago o a mano", () => {
    expect(referenciaPago({ mp_pago_id: 99, orden_id: "ord_x" })).toBe("mp_99");
    expect(referenciaPago({ mp_pago_id: null, orden_id: "ord_x" })).toBe("manual_ord_x");
  });

  it("2xx enviado; 400 fallido; 401, 5xx y sin conexión se reintentan con espera creciente", () => {
    expect(decidir(201, 0).estado).toBe("enviado");
    expect(decidir(200, 3).estado).toBe("enviado");
    expect(decidir(400, 0).estado).toBe("fallido");
    expect(decidir(401, 0)).toMatchObject({ estado: "pendiente", esperaMin: 5 });
    expect(decidir(503, 3)).toMatchObject({ estado: "pendiente", esperaMin: 40 });
    expect(decidir(0, 10).esperaMin).toBe(24 * 60);
    expect(decidir(500, 11).estado).toBe("fallido");
  });
});

describe("no se ofrece cobro con un pago en revisión o sin precios reales", () => {
  it("pago devuelto o para revisar sin resolver: en_revision", () => {
    expect(siguienteCobro({ ...base, pago_en_revision: true }, tabla, nada)).toEqual({ ok: false, motivo: "en_revision" });
  });
  it("precios de la semilla (no de Supabase): sin_precios", () => {
    expect(siguienteCobro({ ...base, sin_precios: true }, tabla, nada)).toEqual({ ok: false, motivo: "sin_precios" });
  });
});

describe("abonos netos (igual que monto_esperado en la base)", () => {
  it("lo pagado se cuenta neto de devoluciones", () => {
    expect(sumarPagado([{ tipo: "anticipo", monto: 6_700_000, cuenta: true, monto_devuelto: 1_000_000 }])).toEqual({ diseno: 0, anticipo: 5_700_000, saldo: 0 });
  });
  it("cada cobro pide solo lo que falta de su tipo", () => {
    const pagado = { diseno: 300000, anticipo: 6_700_000, saldo: 0 };
    // Anticipo con un abono ya conservado: 35% de 30.000.000 − 300.000 − 6.700.000 = 3.500.000
    expect(siguienteCobro({ ...base, pago_estado: "diseno", valor_final: 30_000_000 }, tabla, pagado)).toEqual({ ok: true, tipo: "anticipo", monto: 3_500_000 });
    // Saldo después de una devolución parcial del anticipo: 21.000.000 − 300.000 − 5.700.000
    expect(siguienteCobro({ ...base, pago_estado: "anticipo", valor_final_medido: 21_000_000 }, tabla, { diseno: 300000, anticipo: 5_700_000, saldo: 0 })).toEqual({ ok: true, tipo: "saldo", monto: 15_000_000 });
  });
});

describe("saldo recobrable tras una devolución", () => {
  it("con el saldo pagado pero plata faltante, se cobra solo lo que falta", () => {
    const pagado = { diseno: 300000, anticipo: 6_700_000, saldo: 12_000_000 }; // se devolvieron 2.000.000 del saldo
    expect(siguienteCobro({ ...base, pago_estado: "saldo", valor_final_medido: 21_000_000 }, tabla, pagado)).toEqual({ ok: true, tipo: "saldo", monto: 2_000_000 });
    expect(siguienteCobro({ ...base, pago_estado: "saldo", valor_final_medido: 21_000_000 }, tabla, { ...pagado, saldo: 14_000_000 })).toEqual({ ok: false, motivo: "pagado_todo" });
  });
});
