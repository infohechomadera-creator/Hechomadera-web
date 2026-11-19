/** W5 · Acciones de pagos y borrado del CRM: revisan rol, que la persona vea el lead y el orden de los pasos. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const LEAD = "20000000-0000-4000-a000-00000000000a";
const UID = "00000000-0000-4000-a000-00000000000a";

const e = vi.hoisted(() => ({
  rol: "gerencia" as string | null,
  visible: true,
  lead: { pago_estado: "diseno", estado: "propuesta_enviada" },
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  respuesta: { ok: true } as Record<string, unknown>,
  fotosOk: true,
  fotosLlamadas: 0,
  cobro: { ok: true, tipo: "anticipo", monto: 6_700_000 } as Record<string, unknown>,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/sesion", () => ({ rolActual: async () => e.rol }));
vi.mock("@/lib/precios/fechas", () => ({ hoyEnColombia: () => "2026-11-19" }));
vi.mock("@/lib/email-notifications", () => ({ avisarPagoLead: async () => undefined }));
vi.mock("@/lib/borrado", () => ({ borrarFotosDelCliente: async () => (e.fotosLlamadas++, e.fotosOk) }));
vi.mock("@/lib/integracion/salida", () => ({ enviarPendientes: async () => ({ enviados: 0, pendientes: 0, fallidos: 0, conectado: false }) }));
vi.mock("@/lib/pagos/lead", () => ({ leerCobroLead: async () => ({ leadId: LEAD, producto: "cocina", ciudad: "Barranquilla", cobro: e.cobro }) }));
vi.mock("@/lib/supabase/servidor", () => ({
  clienteUsuario: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: UID } } }) },
    from: () => {
      let columnas = "";
      const q = {
        select: (c: string) => ((columnas = c), q),
        eq: () => q,
        maybeSingle: async () => ({ data: e.visible ? (columnas === "id" ? { id: LEAD } : e.lead) : null }),
      };
      return q;
    },
  }),
  clienteSistema: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => (e.rpc.push({ fn, args }), { data: e.respuesta, error: null }),
  }),
}));

import { borrarCliente, marcarPagoManual, noAprobo, ponerValorFinal, reenviarOperflow, resolverPago } from "@/app/admin/leads/acciones";

beforeEach(() => {
  e.rol = "gerencia";
  e.visible = true;
  e.lead = { pago_estado: "diseno", estado: "propuesta_enviada" };
  e.rpc.length = 0;
  e.respuesta = { ok: true, nuevo_aprobado: true };
  e.fotosOk = true;
  e.fotosLlamadas = 0;
  e.cobro = { ok: true, tipo: "anticipo", monto: 6_700_000 };
});

describe("pago a mano y valor final: solo gerencia", () => {
  it("un asesor no registra pagos, no pone valor final, no borra clientes ni reenvía", async () => {
    e.rol = "asesor";
    expect(await marcarPagoManual(LEAD, "transferencia", 6_700_000)).toMatchObject({ ok: false });
    expect(await ponerValorFinal(LEAD, 20_000_000, false)).toMatchObject({ ok: false });
    expect(await borrarCliente(LEAD, "BORRAR")).toMatchObject({ ok: false });
    expect(await reenviarOperflow(LEAD)).toMatchObject({ ok: false });
    expect(e.rpc).toHaveLength(0);
    expect(e.fotosLlamadas).toBe(0);
  });

  it("el pago a mano usa el tipo y el valor que calcula el servidor, a nombre de quien lo hace", async () => {
    expect(await marcarPagoManual(LEAD, "  Transferencia Bancolombia  ", 6_700_000)).toEqual({ ok: true });
    expect(e.rpc[0]).toMatchObject({
      fn: "registrar_pago_manual",
      args: { p_lead: LEAD, p_tipo: "anticipo", p_monto: 6_700_000, p_autor: UID, p_nota: "Transferencia Bancolombia" },
    });
    expect(String(e.rpc[0].args.p_orden_id)).toMatch(/^ord_[a-z0-9]+_[0-9a-f]{16}$/);
  });

  it("sin pago pendiente o sin nota, no registra nada", async () => {
    e.cobro = { ok: false, motivo: "espera_propuesta" };
    expect(await marcarPagoManual(LEAD, "transferencia", 6_700_000)).toMatchObject({ ok: false });
    e.cobro = { ok: true, tipo: "diseno", monto: 300000 };
    expect(await marcarPagoManual(LEAD, "  ", 300000)).toMatchObject({ ok: false });
    expect(e.rpc).toHaveLength(0);
  });

  it("valor final: solo números enteros razonables", async () => {
    for (const v of [0, 99_999, 1.5, Number.NaN]) expect(await ponerValorFinal(LEAD, v, false)).toMatchObject({ ok: false });
    expect(e.rpc).toHaveLength(0);
    expect(await ponerValorFinal(LEAD, 18_500_000, true)).toEqual({ ok: true });
    expect(e.rpc[0]).toMatchObject({ fn: "poner_valor_final", args: { p_valor: 18_500_000, p_medido: true, p_autor: UID } });
  });

  it("si la base dice que no aplica, se muestra un mensaje simple", async () => {
    e.respuesta = { ok: false, motivo: "estado" };
    expect(await ponerValorFinal(LEAD, 18_500_000, false)).toEqual({ ok: false, error: "Ese cambio no aplica al estado actual del lead." });
  });
});

describe("no aprobó", () => {
  it("el asesor del lead puede, después de entregar el render; primero fotos, luego la base", async () => {
    e.rol = "asesor";
    expect(await noAprobo(LEAD, true)).toEqual({ ok: true });
    expect(e.fotosLlamadas).toBe(1);
    expect(e.rpc[0]).toMatchObject({ fn: "borrar_datos_cliente", args: { p_lead: LEAD, p_autor: UID, p_motivo: "no_aprobo" } });
  });

  it("sin marcar que entregó el render, no borra nada", async () => {
    expect(await noAprobo(LEAD, false)).toMatchObject({ ok: false });
    expect(e.fotosLlamadas + e.rpc.length).toBe(0);
  });

  it("un lead que no ve (de otro asesor) o que no pagó el diseño: no borra nada", async () => {
    e.visible = false;
    expect(await noAprobo(LEAD, true)).toMatchObject({ ok: false });
    e.visible = true;
    e.lead = { pago_estado: "nada", estado: "contactado" };
    expect(await noAprobo(LEAD, true)).toMatchObject({ ok: false });
    e.lead = { pago_estado: "anticipo", estado: "aprobado" };
    expect(await noAprobo(LEAD, true)).toMatchObject({ ok: false });
    expect(e.fotosLlamadas + e.rpc.length).toBe(0);
  });

  it("si las fotos no se pudieron borrar, no sigue con los datos", async () => {
    e.fotosOk = false;
    expect(await noAprobo(LEAD, true)).toMatchObject({ ok: false });
    expect(e.rpc).toHaveLength(0);
  });
});

describe("borrar cliente", () => {
  it("pide escribir BORRAR", async () => {
    expect(await borrarCliente(LEAD, "borrar")).toMatchObject({ ok: false });
    expect(e.fotosLlamadas + e.rpc.length).toBe(0);
  });

  it("gerencia: borra fotos y luego datos; avisa si el cliente quedó borrado del todo", async () => {
    e.respuesta = { ok: true, resultado: "borrado" };
    expect(await borrarCliente(LEAD, "BORRAR")).toEqual({ ok: true, borrado: true });
    expect(e.fotosLlamadas).toBe(1);
    expect(e.rpc[0]).toMatchObject({ fn: "borrar_datos_cliente", args: { p_motivo: "borrar" } });
  });
});

describe("pago a mano: lo que se vio es lo que se registra", () => {
  it("si el valor cambió desde que gerencia lo vio, no registra nada", async () => {
    expect(await marcarPagoManual(LEAD, "transferencia", 6_000_000)).toMatchObject({ ok: false });
    expect(e.rpc).toHaveLength(0);
  });

  it("si la base no lo cuenta (repetido o valor cambiado), avisa que NO cuenta", async () => {
    e.respuesta = { ok: true, nuevo_aprobado: false, alerta: "valor_cambio" };
    const r = await marcarPagoManual(LEAD, "transferencia", 6_700_000);
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(r)).toContain("NO cuenta");
  });
});

describe("marcar resuelto un pago", () => {
  it("solo gerencia, con nota, y a su nombre", async () => {
    e.rol = "asesor";
    expect(await resolverPago(LEAD, 7, "devuelto en MP")).toMatchObject({ ok: false });
    expect(e.rpc).toHaveLength(0);
    e.rol = "gerencia";
    expect(await resolverPago(LEAD, 7, "  ")).toMatchObject({ ok: false });
    expect(await resolverPago(LEAD, 7, "Devuelto en MP el 20/11")).toEqual({ ok: true });
    expect(e.rpc[0]).toMatchObject({ fn: "resolver_pago", args: { p_pago_id: 7, p_autor: UID, p_nota: "Devuelto en MP el 20/11" } });
  });
});
