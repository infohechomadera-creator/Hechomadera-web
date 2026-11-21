/**
 * Pruebas de la base para W5 (pagos por lead, Operflow y borrado de datos), sobre las migraciones reales.
 * "Sistema" = el servidor con la llave secreta (sin usuario). Cada prueba se deshace al terminar.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    "select public.registrar_pago($1, $2, $3, $4, $5, 'visa', 'accredited', now(), false, 0) as r",
    [orden, mpId, estado, monto, moneda],
  ).then((x) => x.r);

beforeAll(async () => {
  db = await crearBase();
  await sembrarPersonas(db);
  // Precios de ejemplo (diseño de cocina 300.000, anticipo 35%): la base recalcula cada cobro con ellos.
  await db.exec(readFileSync(join(process.cwd(), "supabase", "semillas", "precios_ejemplo.sql"), "utf8"));
}, 60_000);

describe("quién puede qué", () => {
  it("con sesión nadie ejecuta las funciones de pagos (solo el servidor)", async () => {
    for (const quien of [publico, asesorA, gerencia]) {
      await expect(
        como(db, quien, (tx) =>
          tx.query("select public.registrar_pago('ord_x1234', 1, 'approved', 300000, 'COP', null, null, now(), false, 0)"),
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
      const aviso = `select public.registrar_aviso_operflow('${huella}', '${IDS.leadA}', 'propuesta_lista', 'p-1', 'propuesta', 'lista', 18000000, 'https://operflow.test/p/1', now()) as r`;
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
        tx, `select public.registrar_aviso_operflow('${"b".repeat(64)}', '${IDS.leadB}', 'entregado', null, null, null, null, null, now()) as r`);
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

describe("refuerzo: ningún lead queda pagado con plata faltante", () => {
  const valorFinal = (tx: Tx, v: number, medido: boolean) =>
    uno<{ r: Record<string, unknown> }>(tx, `select public.poner_valor_final('${IDS.leadA}', ${v}, ${medido}, '${IDS.gerencia}') as r`).then((x) => x.r);
  const hastaAnticipo = async (tx: Tx) => {
    await crearOrden(tx, "ord_r_dis", "diseno", IDS.leadA, 300000);
    await registrar(tx, "ord_r_dis", 701, "approved", 300000);
    await valorFinal(tx, 20_000_000, false);
    await crearOrden(tx, "ord_r_ant", "anticipo", IDS.leadA, 6_700_000);
    await registrar(tx, "ord_r_ant", 702, "approved", 6_700_000);
  };

  it("un saldo viejo pagado después de corregir el valor medido no cuenta y avisa", async () => {
    await como(db, sistema, async (tx) => {
      await hastaAnticipo(tx);
      await valorFinal(tx, 21_000_000, true);
      await crearOrden(tx, "ord_r_sal", "saldo", IDS.leadA, 14_000_000); // cobro con el valor de ese momento
      await valorFinal(tx, 23_000_000, true); // gerencia corrige: ahora el saldo es 16.000.000
      const r = await registrar(tx, "ord_r_sal", 703, "approved", 14_000_000);
      expect(r).toMatchObject({ nuevo_aprobado: false, alerta: "valor_cambio" });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("anticipo");
      expect((await uno<{ estado: string; cuenta: boolean }>(tx, "select estado, cuenta from public.pagos where mp_pago_id = 703"))).toEqual({ estado: "revisar", cuenta: false });
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'C'")).toBe(1);
    });
  });

  it("un anticipo viejo pagado después de corregir el valor final no cuenta", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_r2_dis", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_r2_dis", 711, "approved", 300000);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_r2_ant", "anticipo", IDS.leadA, 6_700_000);
      await valorFinal(tx, 30_000_000, false);
      expect(await registrar(tx, "ord_r2_ant", 712, "approved", 6_700_000)).toMatchObject({ alerta: "valor_cambio" });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("diseno");
    });
  });

  it("un valor final que deja el anticipo en cero o menos se rechaza", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_r3_dis", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_r3_dis", 721, "approved", 300000);
      expect(await valorFinal(tx, 500_000, false)).toMatchObject({ ok: false, motivo: "anticipo_cero" });
      expect((await uno<{ valor_final: number | null }>(tx, "select valor_final from public.leads where id = $1", [IDS.leadA])).valor_final).toBeNull();
    });
  });

  it("un pago devuelto deja de contar y avisa; un reclamo sobre un pago aprobado avisa una vez", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_r4xx", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_r4xx", 731, "approved", 300000);
      expect(await registrar(tx, "ord_r4xx", 731, "in_mediation", 300000)).toMatchObject({ alerta: "reclamo" });
      expect(await registrar(tx, "ord_r4xx", 731, "in_mediation", 300000)).toMatchObject({ sin_cambios: true });
      expect((await uno<{ cuenta: boolean }>(tx, "select cuenta from public.pagos where mp_pago_id = 731")).cuenta).toBe(true);
      expect(await registrar(tx, "ord_r4xx", 731, "refunded", 300000)).toMatchObject({ alerta: "devuelto" });
      expect((await uno<{ estado: string; cuenta: boolean }>(tx, "select estado, cuenta from public.pagos where mp_pago_id = 731"))).toEqual({ estado: "devuelto", cuenta: false });
      // Un aviso viejo "aprobado" no lo revive.
      expect(await registrar(tx, "ord_r4xx", 731, "approved", 300000)).toMatchObject({ sin_cambios: true });
    });
  });

  it("un pago de prueba en un lead REAL no cuenta y avisa", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_r6xx", "diseno", IDS.leadA, 300000);
      const r = await uno<{ r: Record<string, unknown> }>(tx, "select public.registrar_pago('ord_r6xx', 742, 'approved', 300000, 'COP', null, null, now(), true, 0) as r");
      expect(r.r).toMatchObject({ nuevo_aprobado: false, alerta: "prueba" });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("nada");
      expect(await contar(tx, "select 1 from public.mensajes_operflow")).toBe(0);
    });
  });

  it("un pago de prueba en un lead de PRUEBA cuenta y lo dice el historial", async () => {
    await como(db, sistema, async (tx) => {
      await tx.query("update public.leads set es_prueba = true where id = $1", [IDS.leadA]);
      await crearOrden(tx, "ord_r5xx", "diseno", IDS.leadA, 300000);
      await tx.query("select public.registrar_pago('ord_r5xx', 741, 'approved', 300000, 'COP', null, null, now(), true, 0)");
      expect((await uno<{ modo_prueba: boolean }>(tx, "select modo_prueba from public.pagos where mp_pago_id = 741")).modo_prueba).toBe(true);
      expect(await contar(tx, "select 1 from public.actividades where detalle like '%PRUEBA, sin dinero real%'")).toBe(1);
    });
  });
});

describe("refuerzo: avisos de Operflow fuera de orden", () => {
  const aviso = (h: string, lead: string, evento: string, fecha: string, valor: number | null = null) =>
    `select public.registrar_aviso_operflow('${h.repeat(64)}', '${lead}', '${evento}', 'p-1', 'etapa', 'estado', ${valor ?? "null"}, null, '${fecha}') as r`;

  it("un aviso más viejo se ignora y 'cancelado' no se pisa", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_b1xx", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_b1xx", 801, "approved", 300000);
      await tx.query(aviso("c", IDS.leadA, "cancelado_tras_medicion", "2026-11-19T12:00:00Z"));
      expect((await uno<{ r: Record<string, unknown> }>(tx, aviso("d", IDS.leadA, "etapa_cambiada", "2026-11-19T11:00:00Z"))).r).toMatchObject({ viejo: true });
      await tx.query(aviso("e", IDS.leadA, "etapa_cambiada", "2026-11-19T13:00:00Z"));
      expect((await uno<{ operflow_estado: string }>(tx, "select operflow_estado from public.leads where id = $1", [IDS.leadA])).operflow_estado).toBe("cancelado");
    });
  });

  it("un aviso rechazado no queda como 'ya recibido'", async () => {
    await como(db, sistema, async (tx) => {
      expect((await uno<{ r: Record<string, unknown> }>(tx, aviso("f", IDS.leadA, "entregado", "2026-11-19T12:00:00Z"))).r.ok).toBe(false);
      await crearOrden(tx, "ord_b2xx", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_b2xx", 802, "approved", 300000);
      expect((await uno<{ r: Record<string, unknown> }>(tx, aviso("f", IDS.leadA, "entregado", "2026-11-19T12:00:00Z"))).r).toEqual({ ok: true });
    });
  });

  it("el valor ajustado no cambia un lead que ya pagó todo", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_b3xx", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_b3xx", 803, "approved", 300000);
      await tx.query("update public.leads set pago_estado = 'saldo', estado = 'aprobado', valor_final_medido = 1000000 where id = $1", [IDS.leadA]);
      await tx.query(aviso("9", IDS.leadA, "valor_ajustado", "2026-11-19T12:00:00Z", 2_000_000));
      expect(Number((await uno<{ valor_final_medido: number }>(tx, "select valor_final_medido from public.leads where id = $1", [IDS.leadA])).valor_final_medido)).toBe(1_000_000);
    });
  });
});

describe("refuerzo: borrado", () => {
  it("un cliente con un cobro reciente (aún pagable) no se borra entero: se conservan las órdenes", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_c1xx", "diseno", IDS.leadB, 300000);
      await tx.query("update public.ordenes set url_pago = 'https://mp.test/x' where id = 'ord_c1xx'");
      const r = await uno<{ r: { resultado: string } }>(tx, `select public.borrar_datos_cliente('${IDS.leadB}', '${IDS.gerencia}', 'borrar') as r`);
      expect(r.r.resultado).toBe("anonimizado");
      expect(await contar(tx, "select 1 from public.ordenes where id = 'ord_c1xx'")).toBe(1);
      expect((await uno<{ nombre: string }>(tx, "select nombre from public.clientes where id = $1", [IDS.clienteB])).nombre).toBe("Cliente borrado");
    });
  });

  it("el E sale si el A se intentó enviar aunque no haya quedado 'enviado'; la nota del pago a mano se limpia", async () => {
    await como(db, sistema, async (tx) => {
      await tx.query(`select public.registrar_pago_manual('${IDS.leadA}', 'diseno', 300000, '${IDS.gerencia}', 'Transferencia de Ana Pérez', 'ord_c2xx')`);
      await tx.query("update public.mensajes_operflow set intentos = 1 where lead_id = $1 and mensaje = 'A'", [IDS.leadA]);
      await tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorA}', 'no_aprobo')`);
      expect(await contar(tx, "select 1 from public.mensajes_operflow where lead_id = $1 and mensaje = 'E' and estado = 'pendiente'", [IDS.leadA])).toBe(1);
      expect(await contar(tx, "select 1 from public.actividades where detalle like '%Ana Pérez%'")).toBe(0);
      expect((await uno<{ nota: string | null }>(tx, "select nota from public.ordenes where id = 'ord_c2xx'")).nota).toBeNull();
    });
  });

  it("con sesión, ni gerencia borra clientes o leads directamente", async () => {
    await expect(como(db, gerencia, (tx) => tx.query("delete from public.clientes where id = $1", [IDS.clienteB]))).rejects.toThrow(/permission denied/);
    await expect(como(db, gerencia, (tx) => tx.query("delete from public.leads where id = $1", [IDS.leadB]))).rejects.toThrow(/permission denied/);
  });
});

describe("segundo refuerzo: leads cerrados, devueltos y valores", () => {
  const valorFinal = (tx: Tx, v: number, medido: boolean) =>
    uno<{ r: Record<string, unknown> }>(tx, `select public.poner_valor_final('${IDS.leadA}', ${v}, ${medido}, '${IDS.gerencia}') as r`).then((x) => x.r);
  const conDiseno = async (tx: Tx, mp: number) => {
    await crearOrden(tx, `ord_s${mp}`, "diseno", IDS.leadA, 300000);
    await registrar(tx, `ord_s${mp}`, mp, "approved", 300000);
  };

  it("un anticipo pagado después de 'no aprobó' no cuenta (lead cerrado) y avisa", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 901);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s902", "anticipo", IDS.leadA, 6_700_000);
      await tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorA}', 'no_aprobo')`);
      expect(await registrar(tx, "ord_s902", 902, "approved", 6_700_000)).toMatchObject({ nuevo_aprobado: false, alerta: "cerrado" });
      expect((await uno<{ pago_estado: string; estado: string }>(tx, "select pago_estado, estado from public.leads where id = $1", [IDS.leadA]))).toEqual({ pago_estado: "diseno", estado: "no_aprobo" });
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'C'")).toBe(0);
    });
  });

  it("un diseño pagado después de 'borrar cliente' no cuenta", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_s903", "diseno", IDS.leadA, 300000);
      await tx.query("update public.ordenes set url_pago = 'https://mp.test/y' where id = 'ord_s903'");
      await tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.gerencia}', 'borrar')`);
      expect(await registrar(tx, "ord_s903", 903, "approved", 300000)).toMatchObject({ alerta: "cerrado" });
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'A'")).toBe(0);
    });
  });

  it("un saldo pagado después de 'cancelado tras medición' no cuenta", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 904);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s905", "anticipo", IDS.leadA, 6_700_000);
      await registrar(tx, "ord_s905", 905, "approved", 6_700_000);
      await valorFinal(tx, 21_000_000, true);
      await crearOrden(tx, "ord_s906", "saldo", IDS.leadA, 14_000_000);
      await tx.query(`select public.registrar_aviso_operflow('${"1".repeat(64)}', '${IDS.leadA}', 'cancelado_tras_medicion', null, null, null, null, null, now())`);
      expect(await registrar(tx, "ord_s906", 906, "approved", 14_000_000)).toMatchObject({ alerta: "cerrado" });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("anticipo");
    });
  });

  it("con un pago devuelto sin resolver, el siguiente no cuenta; al resolverlo, sí", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 907);
      await registrar(tx, "ord_s907", 907, "refunded", 300000);
      // El lead sigue en 'diseno' (gerencia decide), pero el diseño ya no cuenta: el anticipo sería 35% completo.
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s908", "anticipo", IDS.leadA, 7_000_000);
      expect(await registrar(tx, "ord_s908", 908, "approved", 7_000_000)).toMatchObject({ alerta: "en_revision" });
      const devuelto = await uno<{ id: number }>(tx, "select id from public.pagos where mp_pago_id = 907");
      // Solo gerencia resuelve, con nota.
      expect((await uno<{ r: { ok: boolean } }>(tx, `select public.resolver_pago(${devuelto.id}, '${IDS.asesorA}', 'devuelto', 'devuelto') as r`)).r.ok).toBe(false);
      expect((await uno<{ r: { ok: boolean } }>(tx, `select public.resolver_pago(${devuelto.id}, '${IDS.gerencia}', 'Devuelto en MP el 20/11', 'devuelto') as r`)).r.ok).toBe(true);
      // El anticipo que quedó "para revisar" sí entró: gerencia lo CONSERVA y cuenta (completa el anticipo).
      const retenido = await uno<{ id: number }>(tx, "select id from public.pagos where mp_pago_id = 908");
      const r = await uno<{ r: Record<string, unknown> }>(tx, `select public.resolver_pago(${retenido.id}, '${IDS.gerencia}', 'Se queda, cuadra', 'conservar') as r`);
      expect(r.r).toMatchObject({ ok: true, completo: true });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("anticipo");
      // Y no se vuelve a cobrar: un nuevo anticipo es repetido.
      await crearOrden(tx, "ord_s909", "anticipo", IDS.leadA, 7_000_000);
      expect(await registrar(tx, "ord_s909", 909, "approved", 7_000_000)).toMatchObject({ alerta: "repetido" });
    });
  });

  it("una devolución parcial cuenta solo lo que quedó y el saldo cobra la diferencia", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 920);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s921", "anticipo", IDS.leadA, 6_700_000);
      await registrar(tx, "ord_s921", 921, "approved", 6_700_000);
      // Mercado Pago devuelve 1.000.000 del anticipo (sigue "approved" con monto devuelto).
      const r = await uno<{ r: Record<string, unknown> }>(
        tx, "select public.registrar_pago('ord_s921', 921, 'approved', 6700000, 'COP', null, null, now(), false, 1000000) as r");
      expect(r.r).toMatchObject({ alerta: "devolucion_parcial" });
      await valorFinal(tx, 21_000_000, true);
      // Saldo = 21.000.000 − 300.000 − (6.700.000 − 1.000.000) = 15.000.000
      expect(Number((await uno<{ v: number }>(tx, `select public.monto_esperado('${IDS.leadA}', 'saldo') as v`)).v)).toBe(15_000_000);
      // El mismo aviso otra vez no repite nada.
      const otra = await uno<{ r: Record<string, unknown> }>(
        tx, "select public.registrar_pago('ord_s921', 921, 'approved', 6700000, 'COP', null, null, now(), false, 1000000) as r");
      expect(otra.r).toMatchObject({ sin_cambios: true });
    });
  });

  it("conservar un pago para revisar como abono parcial: el siguiente cobro pide solo lo que falta", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 930);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s931", "anticipo", IDS.leadA, 6_700_000);
      await valorFinal(tx, 30_000_000, false); // ahora faltan 10.200.000; el cobro viejo era de 6.700.000
      expect(await registrar(tx, "ord_s931", 931, "approved", 6_700_000)).toMatchObject({ alerta: "valor_cambio" });
      const viejo = await uno<{ id: number }>(tx, "select id from public.pagos where mp_pago_id = 931");
      const r = await uno<{ r: Record<string, unknown> }>(tx, `select public.resolver_pago(${viejo.id}, '${IDS.gerencia}', 'Se queda como abono', 'conservar') as r`);
      expect(r.r).toMatchObject({ ok: true, completo: false });
      expect(Number((await uno<{ v: number }>(tx, `select public.monto_esperado('${IDS.leadA}', 'anticipo') as v`)).v)).toBe(3_500_000);
      await crearOrden(tx, "ord_s932", "anticipo", IDS.leadA, 3_500_000);
      expect(await registrar(tx, "ord_s932", 932, "approved", 3_500_000)).toMatchObject({ nuevo_aprobado: true });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("anticipo");
    });
  });

  it("no se puede conservar un pago que pasa de lo que falta", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 940);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s941", "anticipo", IDS.leadA, 6_700_000);
      await valorFinal(tx, 15_000_000, false); // ahora faltan 4.950.000
      await registrar(tx, "ord_s941", 941, "approved", 6_700_000);
      const viejo = await uno<{ id: number }>(tx, "select id from public.pagos where mp_pago_id = 941");
      const r = await uno<{ r: Record<string, unknown> }>(tx, `select public.resolver_pago(${viejo.id}, '${IDS.gerencia}', 'quedarse', 'conservar') as r`);
      expect(r.r).toMatchObject({ ok: false, motivo: "excede" });
    });
  });

  it("un valor medido que no deja saldo se rechaza", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 910);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_s911", "anticipo", IDS.leadA, 6_700_000);
      await registrar(tx, "ord_s911", 911, "approved", 6_700_000);
      expect(await valorFinal(tx, 7_000_000, true)).toMatchObject({ ok: false, motivo: "saldo_cero" });
    });
  });

  it("un valor ajustado tardío se aplica aunque haya llegado antes un cambio de etapa más nuevo", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 912);
      await tx.query(`select public.registrar_aviso_operflow('${"2".repeat(64)}', '${IDS.leadA}', 'etapa_cambiada', 'p', 'produccion', 'x', null, null, '2026-11-19T15:00:00Z')`);
      await tx.query(`select public.registrar_aviso_operflow('${"3".repeat(64)}', '${IDS.leadA}', 'valor_ajustado', 'p', null, null, 21000000, null, '2026-11-19T14:00:00Z')`);
      expect(Number((await uno<{ v: number }>(tx, "select valor_final_medido as v from public.leads where id = $1", [IDS.leadA])).v)).toBe(21_000_000);
      // Y uno de valor más viejo que el último valor sí se ignora (con rastro en el historial).
      await tx.query(`select public.registrar_aviso_operflow('${"4".repeat(64)}', '${IDS.leadA}', 'valor_ajustado', 'p', null, null, 19000000, null, '2026-11-19T13:00:00Z')`);
      expect(Number((await uno<{ v: number }>(tx, "select valor_final_medido as v from public.leads where id = $1", [IDS.leadA])).v)).toBe(21_000_000);
      expect(await contar(tx, "select 1 from public.actividades where detalle like '%más viejo que el último%'")).toBe(1);
    });
  });

  it("el E sale si el A obtuvo alguna respuesta, aunque fallara", async () => {
    await como(db, sistema, async (tx) => {
      await conDiseno(tx, 913);
      await tx.query("update public.mensajes_operflow set estado = 'fallido', intentos = 0, respuesta_http = 0 where mensaje = 'A'");
      await tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.asesorA}', 'no_aprobo')`);
      expect(await contar(tx, "select 1 from public.mensajes_operflow where mensaje = 'E'")).toBe(1);
    });
  });

  it("con sesión nadie marca un lead como de prueba", async () => {
    await expect(como(db, gerencia, (tx) => tx.query("update public.leads set es_prueba = true where id = $1", [IDS.leadA]))).rejects.toThrow(
      /lo cambia solo el sistema/,
    );
  });
});

describe("cuarto refuerzo: devoluciones de pagos que contaban", () => {
  const valorFinal = (tx: Tx, v: number, medido: boolean) =>
    uno<{ r: Record<string, unknown> }>(tx, `select public.poner_valor_final('${IDS.leadA}', ${v}, ${medido}, '${IDS.gerencia}') as r`).then((x) => x.r);
  const reg = (tx: Tx, orden: string, mp: number, estado: string, monto: number, devuelto: number) =>
    uno<{ r: Record<string, unknown> }>(
      tx, `select public.registrar_pago('${orden}', ${mp}, '${estado}', ${monto}, 'COP', null, null, now(), false, ${devuelto}) as r`,
    ).then((x) => x.r);

  it("contracargo de un abono que gerencia conservó: avisa, deja de contar y vuelve a bloquear", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_t001", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_t001", 1001, "approved", 300000);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_t002", "anticipo", IDS.leadA, 6_700_000);
      await valorFinal(tx, 15_000_000, false); // ahora faltan 4.950.000; el viejo de 6.700.000 queda para revisar
      await registrar(tx, "ord_t002", 1002, "approved", 6_700_000);
      // Gerencia devuelve 1.750.000 en MP y conserva el resto (4.950.000), que completa el anticipo.
      await reg(tx, "ord_t002", 1002, "approved", 6_700_000, 1_750_000);
      const p = await uno<{ id: number }>(tx, "select id from public.pagos where mp_pago_id = 1002");
      expect((await uno<{ r: Record<string, unknown> }>(tx, `select public.resolver_pago(${p.id}, '${IDS.gerencia}', 'Se queda el resto', 'conservar') as r`)).r).toMatchObject({ ok: true, completo: true });
      // Después, el cliente hace un contracargo.
      expect(await reg(tx, "ord_t002", 1002, "charged_back", 6_700_000, 6_700_000)).toMatchObject({ alerta: "devuelto" });
      expect(await uno(tx, "select estado, cuenta, resuelto_at from public.pagos where mp_pago_id = 1002")).toEqual({ estado: "devuelto", cuenta: false, resuelto_at: null });
      // Bloquea nuevos pagos hasta que gerencia lo resuelva.
      await valorFinal(tx, 21_000_000, true);
      await crearOrden(tx, "ord_t003", "saldo", IDS.leadA, 1_000_000);
      expect(await registrar(tx, "ord_t003", 1003, "approved", 1_000_000)).toMatchObject({ alerta: "en_revision" });
    });
  });

  it("un pago que llega aprobado pero ya con una parte devuelta cuenta lo neto y no completa el tipo", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_t011", "diseno", IDS.leadA, 300000);
      expect(await reg(tx, "ord_t011", 1011, "approved", 300000, 100000)).toMatchObject({ alerta: "devolucion_parcial", nuevo_aprobado: false });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("nada");
      expect(Number((await uno<{ v: number }>(tx, `select public.monto_esperado('${IDS.leadA}', 'diseno') as v`)).v)).toBe(100000);
      // El siguiente cobro pide solo los 100.000 y completa el diseño.
      await crearOrden(tx, "ord_t012", "diseno", IDS.leadA, 100000);
      expect(await registrar(tx, "ord_t012", 1012, "approved", 100000)).toMatchObject({ nuevo_aprobado: true });
      expect((await uno<{ pago_estado: string }>(tx, "select pago_estado from public.leads where id = $1", [IDS.leadA])).pago_estado).toBe("diseno");
    });
  });

  it("devolución parcial del saldo: se puede cobrar lo que falta aunque el lead ya esté en 'saldo'", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_t021", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_t021", 1021, "approved", 300000);
      await valorFinal(tx, 20_000_000, false);
      await crearOrden(tx, "ord_t022", "anticipo", IDS.leadA, 6_700_000);
      await registrar(tx, "ord_t022", 1022, "approved", 6_700_000);
      await valorFinal(tx, 21_000_000, true);
      await crearOrden(tx, "ord_t023", "saldo", IDS.leadA, 14_000_000);
      await registrar(tx, "ord_t023", 1023, "approved", 14_000_000);
      expect(await reg(tx, "ord_t023", 1023, "approved", 14_000_000, 2_000_000)).toMatchObject({ alerta: "devolucion_parcial" });
      expect(Number((await uno<{ v: number }>(tx, `select public.monto_esperado('${IDS.leadA}', 'saldo') as v`)).v)).toBe(2_000_000);
      await crearOrden(tx, "ord_t024", "saldo", IDS.leadA, 2_000_000);
      expect(await registrar(tx, "ord_t024", 1024, "approved", 2_000_000)).toMatchObject({ nuevo_aprobado: true });
      // Ya completo: otro saldo no cuenta.
      await crearOrden(tx, "ord_t025", "saldo", IDS.leadA, 2_000_000);
      expect(await registrar(tx, "ord_t025", 1025, "approved", 2_000_000)).toMatchObject({ nuevo_aprobado: false });
    });
  });

  it("no se conserva un pago de un cliente con datos borrados", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_t031", "diseno", IDS.leadA, 300000);
      await tx.query("update public.ordenes set url_pago = 'https://mp.test/z' where id = 'ord_t031'");
      await tx.query(`select public.borrar_datos_cliente('${IDS.leadA}', '${IDS.gerencia}', 'borrar')`);
      await registrar(tx, "ord_t031", 1031, "approved", 300000); // queda "cerrado" para revisar
      const p = await uno<{ id: number }>(tx, "select id from public.pagos where mp_pago_id = 1031");
      expect((await uno<{ r: Record<string, unknown> }>(tx, `select public.resolver_pago(${p.id}, '${IDS.gerencia}', 'quedarse', 'conservar') as r`)).r).toMatchObject({ ok: false, motivo: "no_conservable" });
    });
  });

  it("propuesta de Operflow que no deja anticipo por cobrar: avisa", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_t041", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_t041", 1041, "approved", 300000);
      const r = await uno<{ r: Record<string, unknown> }>(tx,
        `select public.registrar_aviso_operflow('${"5".repeat(64)}', '${IDS.leadA}', 'propuesta_lista', 'p', null, null, 800000, null, now()) as r`);
      expect(r.r).toMatchObject({ ok: true, alerta: "sin_cobro" });
    });
  });
});

describe("detalles finales", () => {
  const valorFinal = (tx: Tx, v: number, medido: boolean) =>
    uno<{ r: Record<string, unknown> }>(tx, `select public.poner_valor_final('${IDS.leadA}', ${v}, ${medido}, '${IDS.gerencia}') as r`).then((x) => x.r);
  const reg = (tx: Tx, orden: string, mp: number, estado: string, monto: number, devuelto: number) =>
    uno<{ r: Record<string, unknown> }>(
      tx, `select public.registrar_pago('${orden}', ${mp}, '${estado}', ${monto}, 'COP', null, null, now(), false, ${devuelto}) as r`,
    ).then((x) => x.r);
  const hastaSaldo = async (tx: Tx, base: number) => {
    await crearOrden(tx, `ord_u${base}`, "diseno", IDS.leadA, 300000);
    await registrar(tx, `ord_u${base}`, base, "approved", 300000);
    await valorFinal(tx, 20_000_000, false);
    await crearOrden(tx, `ord_u${base + 1}`, "anticipo", IDS.leadA, 6_700_000);
    await registrar(tx, `ord_u${base + 1}`, base + 1, "approved", 6_700_000);
  };

  it("un pago que llega ya devuelto (nunca contó) queda resuelto solo y no bloquea", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_u001", "diseno", IDS.leadA, 300000);
      await reg(tx, "ord_u001", 2001, "pending", 300000, 0);
      await reg(tx, "ord_u001", 2001, "refunded", 300000, 300000);
      expect((await uno<{ r: boolean }>(tx, "select resuelto_at is not null as r from public.pagos where mp_pago_id = 2001")).r).toBe(true);
      await crearOrden(tx, "ord_u002", "diseno", IDS.leadA, 300000);
      expect(await registrar(tx, "ord_u002", 2002, "approved", 300000)).toMatchObject({ nuevo_aprobado: true });
    });
  });

  it("descuento tras pagar el saldo: gerencia baja el valor medido a lo pagado y no queda deuda", async () => {
    await como(db, sistema, async (tx) => {
      await hastaSaldo(tx, 2010);
      await valorFinal(tx, 21_000_000, true);
      await crearOrden(tx, "ord_u2013", "saldo", IDS.leadA, 14_000_000);
      await registrar(tx, "ord_u2013", 2013, "approved", 14_000_000);
      await reg(tx, "ord_u2013", 2013, "approved", 14_000_000, 1_000_000); // descuento devuelto
      expect(Number((await uno<{ v: number }>(tx, `select public.monto_esperado('${IDS.leadA}', 'saldo') as v`)).v)).toBe(1_000_000);
      expect(await valorFinal(tx, 20_000_000, true)).toMatchObject({ ok: true });
      expect(Number((await uno<{ v: number }>(tx, `select public.monto_esperado('${IDS.leadA}', 'saldo') as v`)).v)).toBe(0);
      // Pero no por debajo de lo pagado.
      expect(await valorFinal(tx, 19_000_000, true)).toMatchObject({ ok: false, motivo: "saldo_cero" });
    });
  });

  it("si al completar el anticipo el valor medido ya está cubierto, queda aviso en el historial", async () => {
    await como(db, sistema, async (tx) => {
      await crearOrden(tx, "ord_u021", "diseno", IDS.leadA, 300000);
      await registrar(tx, "ord_u021", 2021, "approved", 300000);
      await valorFinal(tx, 20_000_000, false);
      await tx.query(`select public.registrar_aviso_operflow('${"6".repeat(64)}', '${IDS.leadA}', 'valor_ajustado', 'p', null, null, 7000000, null, now())`);
      await crearOrden(tx, "ord_u022", "anticipo", IDS.leadA, 6_700_000);
      await registrar(tx, "ord_u022", 2022, "approved", 6_700_000);
      expect(await contar(tx, "select 1 from public.actividades where detalle like 'Con el anticipo pagado no queda saldo%'")).toBe(1);
    });
  });
});
