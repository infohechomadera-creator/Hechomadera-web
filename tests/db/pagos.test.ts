/**
 * Pruebas de la base para W5 (pagos por lead, Operflow y borrado de datos), sobre las migraciones reales.
 * "Sistema" = el servidor con la llave secreta (sin usuario). Cada prueba se deshace al terminar.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { IDS, como, crearBase, sembrarPersonas } from "./entorno";

let db: PGlite;
const sistema = { tipo: "sistema" } as const;
const publico = { tipo: "publico" } as const;
const gerencia = { tipo: "usuario", id: IDS.gerencia } as const;
const asesorA = { tipo: "usuario", id: IDS.asesorA } as const;
const asesorB = { tipo: "usuario", id: IDS.asesorB } as const;

type Tx = Transaction;

async function comoUsuario(tx: Tx, id: string) {
  await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
  await tx.exec("set local role authenticated");
}
async function volverASistema(tx: Tx) {
  await tx.exec("reset role");
  await tx.query("select set_config('request.jwt.claim.sub', '', true)");
}
const uno = async <T>(tx: Tx, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows[0];
const contar = async (tx: Tx, sql: string, params: unknown[] = []) =>
  Number((await uno<{ n: number }>(tx, `select count(*)::int as n from (${sql}) t`, params)).n);

async function crearOrden(tx: Tx, id: string, tipo: string, lead: string | null, total: number) {
  await tx.query("insert into public.ordenes (id, tipo, lead_id, total_cop) values ($1, $2, $3, $4)", [id, tipo, lead, total]);
}
const registrar = (tx: Tx, orden: string, mpId: number, estado: string, monto: number, moneda = "COP") =>
  uno<{ r: Record<string, unknown> }>(
    tx,
    "select public.registrar_pago($1, $2, $3, $4, $5, 'visa', 'accredited', now()) as r",
    [orden, mpId, estado, monto, moneda],
  ).then((x) => x.r);

beforeAll(async () => {
  db = await crearBase();
  await sembrarPersonas(db);
}, 60_000);

describe("quién puede qué", () => {
  it("con sesión nadie ejecuta las funciones de pagos (solo el servidor)", async () => {
    for (const quien of [publico, asesorA, gerencia]) {
      await expect(
        como(db, quien, (tx) =>
          tx.query("select public.registrar_pago('ord_x1234', 1, 'approved', 300000, 'COP', null, null, now())"),
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        como(db, quien, (tx) => tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.gerencia}', 'borrar')`)),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("el asesor ve las órdenes y pagos de su lead, no los del otro; el público nada", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_vera", "diseno", IDS.leadA, 300000);
      await crearOrden(tx, "ord_verb", "diseno", IDS.leadB, 300000);
      await crearOrden(tx, "ord_tienda1", "tienda", null, 50000);
      await registrar(tx, "ord_vera", 101, "approved", 300000);
      await registrar(tx, "ord_verb", 102, "approved", 300000);
      await comoUsuario(tx, IDS.asesorA);
      expect(await contar(tx, "select 1 from public.ordenes")).toBe(1);
      expect(await contar(tx, "select 1 from public.pagos")).toBe(1);
      expect(await contar(tx, "select 1 from public.mensajes_operflow")).toBe(1);
      expect(await contar(tx, "select 1 from public.eventos_pago")).toBe(0);
      await comoUsuario(tx, IDS.gerencia);
      expect(await contar(tx, "select 1 from public.ordenes")).toBe(3);
      expect(await contar(tx, "select 1 from public.mensajes_operflow")).toBe(2);
      await volverASistema(tx);
      await tx.exec("set local role anon");
      await expect(tx.query("select 1 from public.ordenes")).rejects.toThrow(/permission denied/);
    });
  });

  it("nadie con sesión escribe órdenes, pagos ni la bandeja", async () => {
    for (const quien of [gerencia, asesorA]) {
      await expect(
        como(db, quien, (tx) => crearOrden(tx, "ord_mano1", "diseno", IDS.leadA, 1)),
      ).rejects.toThrow(/permission denied/);
      await expect(
        como(db, quien, (tx) => tx.query(`insert into public.mensajes_operflow (lead_id, mensaje) values ('${IDS.leadA}', 'A')`)),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("con sesión nadie (ni gerencia) cambia el valor final ni el enlace de pago", async () => {
    for (const cambio of ["valor_final = 1000", "pago_token = 'x'", "operflow_url_propuesta = 'https://x'"]) {
      await expect(
        como(db, gerencia, (tx) => tx.query(`update public.leads set ${cambio} where id = $1`, [IDS.leadA])),
      ).rejects.toThrow(/lo cambia solo el sistema/);
    }
  });

  it("cada lead tiene un enlace de pago distinto y largo", async () => {
    await como(db, sistema, async (tx) => {
      const r = await tx.query<{ pago_token: string }>("select pago_token from public.leads");
      const tokens = r.rows.map((x) => x.pago_token);
      expect(new Set(tokens).size).toBe(tokens.length);
      for (const t of tokens) expect(t).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

describe("pago del diseño (Mercado Pago)", () => {
  it("marca el filtro, deja historial y el mensaje A pendiente", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_dis1", "diseno", IDS.leadA, 300000);
      const r = await registrar(tx, "ord_dis1", 201, "approved", 300000);
      expect(r).toMatchObject({ ok: true, nuevo_aprobado: true, tipo: "diseno" });
      const lead = await uno<{ pago_estado: string; estado: string }>(tx, "select pago_estado, estado from public.leads where id = $1", [IDS.leadA]);
      expect(lead).toEqual({ pago_estado: "diseno", estado: "diseno_pagado" });
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1 and tipo = 'pago' and detalle like 'Pagó el diseño: $300.000%'", [IDS.leadA])).toBe(1);
      expect(await contar(tx, "select 1 from public.mensajes_operflow where lead_id = $1 and mensaje = 'A' and estado = 'pendiente'", [IDS.leadA])).toBe(1);
      expect((await uno<{ estado: string }>(tx, "select estado from public.ordenes where id = 'ord_dis1'")).estado).toBe("aprobada");
    });
  });

  it("el mismo aviso dos veces no repite nada", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_dis2", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_dis2", 202, "approved", 300000);
      const r = await registrar(tx, "ord_dis2", 202, "approved", 300000);
      expect(r.nuevo_aprobado).toBe(false);
      expect(await contar(tx, "select 1 from public.pagos where mp_pago_id = 202")).toBe(1);
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1 and tipo = 'pago'", [IDS.leadA])).toBe(1);
    });
  });

  it("un aviso viejo 'pendiente' no deshace un pago aprobado", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_dis3", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_dis3", 203, "approved", 300000);
      await registrar(tx, "ord_dis3", 203, "pending", 300000);
      expect((await uno<{ estado: string }>(tx, "select estado from public.pagos where mp_pago_id = 203")).estado).toBe("aprobado");
    });
  });

  it("si el monto o la moneda no cuadran, no cuenta y queda para revisar", async () => {
    for (const [monto, moneda] of [[1000, "COP"], [300000, "USD"]] as const) {
      await como(db, sistema, async (tx) => {
        await crearOrden(tx, "ord_dis4", "diseno", IDS.leadA, 300000);
        const r = await registrar(tx, "ord_dis4", 204, "approved", monto, moneda);
        expect(r.nuevo_aprobado).toBe(false);
        const lead = await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA]);
        expect(lead.pago_estado).toBe("nada");
        expect((await uno<{ estado: string; cuenta: boolean }>(tx, "select estado, cuenta from public.pagos where mp_pago_id = 204"))).toEqual({ estado: "revisar", cuenta: false });
        expect(await contar(tx, "select 1 from public.mensajes_operflow")).toBe(0);
      });
    }
  });

  it("un segundo pago del diseño no cuenta, avisa para devolver y no manda otro A", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_dis5", "diseno", IDS.leadA, 300000);
      await crearOrden(tx, "ord_dis6", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_dis5", 205, "approved", 300000);
      const r = await registrar(tx, "ord_dis6", 206, "approved", 300000);
      expect(r).toMatchObject({ repetido: true, nuevo_aprobado: false });
      expect(await contar(tx, "select 1 from public.pagos where lead_id = $1 and cuenta", [IDS.leadA])).toBe(1);
      expect(await contar(tx, "select 1 from public.mensajes_operflow where lead_id = $1", [IDS.leadA])).toBe(1);
      expect(await contar(tx, "select 1 from public.actividades where detalle like 'Pago repetido%'")).toBe(1);
      // Un nuevo aviso del pago repetido no vuelve a avisar.
      await registrar(tx, "ord_dis6", 206, "approved", 300000);
      expect(await contar(tx, "select 1 from public.actividades where detalle like 'Pago repetido%'")).toBe(1);
    });
  });

  it("un pago rechazado no marca nada", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_dis7", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_dis7", 207, "rejected", 300000);
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("nada");
      expect((await uno<{ estado: string }>(tx, "select estado from public.ordenes where id = 'ord_dis7'")).estado).toBe("rechazada");
    });
  });

  it("una orden que no existe se rechaza", async () => {
    await como(db, sistema, async (tx) => {
      expect(await registrar(tx, "ord_nadaaa", 208, "approved", 300000)).toMatchObject({ ok: false, motivo: "orden_no_existe" });
    });
  });

  it("un lead pagado nunca vuelve a un estado a mano, ni por el sistema", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_dis8", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_dis8", 209, "approved", 300000);
      await expect(tx.query("update public.leads set estado = 'contactado' where id = $1", [IDS.leadA])).rejects.toThrow(
        /leads_pagado_no_vuelve_a_mano/,
      );
    });
  });
});

describe("anticipo, saldo, valor final y pago a mano", () => {
  it("recorre diseño → valor final → anticipo → valor medido → saldo", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_rec1", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_rec1", 301, "approved", 300000);
      // El asesor no pone valor final; gerencia sí.
      expect((await uno<{ r: { ok: boolean } }>(tx, `select public.poner_valor_final('${IDS.leadA}', 20000000, false, '${IDS.asesorA}') as r`)).r.ok).toBe(false);
      expect((await uno<{ r: { ok: boolean } }>(tx, `select public.poner_valor_final('${IDS.leadA}', 20000000, false, '${IDS.gerencia}') as r`)).r.ok).toBe(true);
      expect((await uno<{ estado: string }>(tx, "select estado from public.leads where id = $1", [IDS.leadA])).estado).toBe("propuesta_enviada");
      // El medido antes del anticipo no se acepta.
      expect((await uno<{ r: { motivo: string } }>(tx, `select public.poner_valor_final('${IDS.leadA}', 21000000, true, '${IDS.gerencia}') as r`)).r.motivo).toBe("estado");
      await crearOrden(tx, "ord_rec2", "anticipo", IDS.leadA, 6700000);
      await registrar(tx, "ord_rec2", 302, "approved", 6700000);
      expect(await uno(tx, "select pago_estado, estado from public.leads where id = $1", [IDS.leadA])).toEqual({ pago_estado: "anticipo", estado: "aprobado" });
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'C'")).toBe(1);
      await tx.query(`select public.poner_valor_final('${IDS.leadA}', 21000000, true, '${IDS.gerencia}')`);
      await crearOrden(tx, "ord_rec3", "saldo", IDS.leadA, 14000000);
      await registrar(tx, "ord_rec3", 303, "approved", 14000000);
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("saldo");
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'C'")).toBe(2);
    });
  });

  it("un anticipo antes del diseño no cuenta", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_ant1", "anticipo", IDS.leadA, 5000000);
      const r = await registrar(tx, "ord_ant1", 311, "approved", 5000000);
      expect(r.repetido).toBe(true);
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("nada");
    });
  });

  it("el pago a mano solo lo hace gerencia activa, con nota, y deja su nombre", async () => {
    await como(db, sistema, async (tx) => {
      const asesor = await uno<{ r: { ok: boolean } }>(
        tx, `select public.registrar_pago_manual('${IDS.leadA}', 'diseno', 300000, '${IDS.asesorA}', 'transferencia', 'ord_man1') as r`);
      expect(asesor.r.ok).toBe(false);
      const sinNota = await uno<{ r: { ok: boolean } }>(
        tx, `select public.registrar_pago_manual('${IDS.leadA}', 'diseno', 300000, '${IDS.gerencia}', '  ', 'ord_man1') as r`);
      expect(sinNota.r.ok).toBe(false);
      const ok = await uno<{ r: { ok: boolean; nuevo_aprobado: boolean } }>(
        tx, `select public.registrar_pago_manual('${IDS.leadA}', 'diseno', 300000, '${IDS.gerencia}', 'Transferencia Bancolombia', 'ord_man1') as r`);
      expect(ok.r).toMatchObject({ ok: true, nuevo_aprobado: true });
      const act = await uno<{ autor_id: string; detalle: string }>(
        tx, "select autor_id, detalle from public.actividades where lead_id = $1 and tipo = 'pago'", [IDS.leadA]);
      expect(act.autor_id).toBe(IDS.gerencia);
      expect(act.detalle).toContain("a mano: Transferencia Bancolombia");
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'A'")).toBe(1);
    });
  });
});

describe("avisos de Operflow (mensaje B)", () => {
  const huella = "a".repeat(64);
  it("la propuesta lista pone el valor final y el estado; el mismo aviso no se repite", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_ofb1", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_ofb1", 401, "approved", 300000);
      const aviso = `select public.registrar_aviso_operflow('${huella}', '${IDS.leadA}', 'propuesta_lista', 'p-1', 'propuesta', 'lista', 18000000, 'https://operflow.test/p/1') as r`;
      expect((await uno<{ r: { ok: boolean } }>(tx, aviso)).r.ok).toBe(true);
      expect(await uno(tx, "select estado, valor_final::int, operflow_proyecto_id, operflow_url_propuesta from public.leads where id = $1", [IDS.leadA])).toEqual({
        estado: "propuesta_enviada", valor_final: 18000000, operflow_proyecto_id: "p-1", operflow_url_propuesta: "https://operflow.test/p/1",
      });
      expect((await uno<{ r: { repetido: boolean } }>(tx, aviso)).r.repetido).toBe(true);
      expect(await contar(tx, "select 1 from public.actividades where tipo = 'operflow'")).toBe(1);
    });
  });

  it("no toca leads que no han pagado el diseño", async () => {
    await como(db, sistema, async (tx) => {
      const r = await uno<{ r: { ok: boolean } }>(
        tx, `select public.registrar_aviso_operflow('${"b".repeat(64)}', '${IDS.leadB}', 'entregado', null, null, null, null, null) as r`);
      expect(r.r.ok).toBe(false);
    });
  });
});

describe("no aprobó y borrar cliente", () => {
  it("'no aprobó': el asesor de otro lead no puede; el suyo sí y se borran datos, fotos y notas", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_noa1", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_noa1", 501, "approved", 300000);
      await tx.query("update public.mensajes_operflow set estado = 'enviado' where lead_id = $1", [IDS.leadA]);
      await tx.query(`insert into public.archivos (lead_id, ruta, tipo, bytes) values ($1, $2, 'image/jpeg', 10)`, [
        IDS.leadA, `${IDS.leadA}/30000000-0000-4000-a000-0000000000aa.jpg`]);
      await tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'Vive en la calle 1')`, [IDS.leadA, IDS.asesorA]);

      const ajeno = await uno<{ r: { ok: boolean } }>(tx, `select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorB}', 'no_aprobo') as r`);
      expect(ajeno.r.ok).toBe(false);
      const ok = await uno<{ r: { ok: boolean; resultado: string } }>(tx, `select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorA}', 'no_aprobo') as r`);
      expect(ok.r).toEqual({ ok: true, resultado: "anonimizado" });

      expect(await uno(tx, "select nombre, telefono, email from public.clientes where id = $1", [IDS.clienteA])).toEqual({ nombre: "Cliente borrado", telefono: null, email: null });
      expect((await uno<{ estado: string }>(tx, "select estado from public.leads where id = $1", [IDS.leadA])).estado).toBe("no_aprobo");
      expect(await contar(tx, "select 1 from public.archivos where lead_id = $1", [IDS.leadA])).toBe(0);
      expect(await contar(tx, "select 1 from public.actividades where tipo = 'nota' and lead_id = $1", [IDS.leadA])).toBe(0);
      expect(await contar(tx, "select 1 from public.pagos where lead_id = $1 and cuenta", [IDS.leadA])).toBe(1);
      expect(await contar(tx, "select 1 from public.mensajes_operflow where lead_id = $1 and mensaje = 'E' and estado = 'pendiente'", [IDS.leadA])).toBe(1);

      // Nadie con sesión vuelve a llenar los datos del cliente borrado.
      await comoUsuario(tx, IDS.gerencia);
      await expect(tx.query("update public.clientes set telefono = '3001112233' where id = $1", [IDS.clienteA])).rejects.toThrow(/ya se borraron/);
    });
  });

  it("'no aprobó' antes de que el proyecto llegue a Operflow cancela el A y no manda E", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_noa2", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_noa2", 502, "approved", 300000);
      await tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorA}', 'no_aprobo')`);
      expect(await uno(tx, "select mensaje, estado from public.mensajes_operflow where lead_id = $1", [IDS.leadA])).toEqual({ mensaje: "A", estado: "cancelado" });
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'E'")).toBe(0);
    });
  });

  it("'no aprobó' no aplica a un lead que no ha pagado el diseño", async () => {
    await como(db, sistema, async (tx) => {
      const r = await uno<{ r: { motivo: string } }>(tx, `select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorA}', 'no_aprobo') as r`);
      expect(r.r.motivo).toBe("estado");
    });
  });

  it("borrar cliente: solo gerencia; si nunca pagó se borra entero (también sus órdenes sin pagar)", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_bor1", "diseno", IDS.leadB, 300000);
      await registrar(tx, "ord_bor1", 601, "rejected", 300000);
      const asesor = await uno<{ r: { ok: boolean } }>(tx, `select public.borrar_datos_cliente('${IDS.leadB}', '${IDS.asesorB}', 'borrar') as r`);
      expect(asesor.r.ok).toBe(false);
      const r = await uno<{ r: { resultado: string } }>(tx, `select public.borrar_datos_cliente('${IDS.leadB}', '${IDS.gerencia}', 'borrar') as r`);
      expect(r.r.resultado).toBe("borrado");
      expect(await contar(tx, "select 1 from public.clientes where id = $1", [IDS.clienteB])).toBe(0);
      expect(await contar(tx, "select 1 from public.ordenes where id = 'ord_bor1'")).toBe(0);
    });
  });

  it("un lead con pagos no se puede borrar de la base directamente", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_bor2", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_bor2", 602, "approved", 300000);
      await expect(tx.query("delete from public.clientes where id = $1", [IDS.clienteA])).rejects.toThrow(/foreign key/);
    });
  });
});
