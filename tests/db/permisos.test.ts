/**
 * Pruebas de permisos por rol (W1 + W2) sobre las migraciones reales.
 * Personas ficticias: gerencia, asesor A, asesor B, asesor inactivo y el público.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { IDS, como, comoGuardando, crearBase, sembrarPersonas } from "./entorno";

let db: PGlite;

const gerencia = { tipo: "usuario", id: IDS.gerencia } as const;
const asesorA = { tipo: "usuario", id: IDS.asesorA } as const;
const asesorB = { tipo: "usuario", id: IDS.asesorB } as const;
const inactivo = { tipo: "usuario", id: IDS.asesorInactivo } as const;
const publico = { tipo: "publico" } as const;

const contar = async (tx: { query: PGlite["query"] }, sql: string, params: unknown[] = []) =>
  Number(((await tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params)).rows[0]).n);

beforeAll(async () => {
  db = await crearBase();
  await sembrarPersonas(db);
  await db.query(
    `insert into public.precios (ciudad, vigente_desde, datos, creado_por) values ('Barranquilla', '2026-01-01', '{"v":1}', $1)`,
    [IDS.gerencia],
  );
}, 60_000);

describe("público (sin sesión)", () => {
  for (const tabla of ["perfiles", "clientes", "leads", "actividades", "precios"]) {
    it(`no puede leer ${tabla}`, async () => {
      await expect(como(db, publico, (tx) => tx.query(`select * from public.${tabla}`))).rejects.toThrow(
        /permission denied/,
      );
    });
  }

  it("no puede crear leads", async () => {
    await expect(
      como(db, publico, (tx) =>
        tx.query(`insert into public.leads (cliente_id, ciudad) values ($1, 'Barranquilla')`, [IDS.clienteA]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("asesor", () => {
  it("ve solo sus leads", async () => {
    const ids = await como(db, asesorA, async (tx) =>
      (await tx.query<{ id: string }>("select id from public.leads")).rows.map((r) => r.id),
    );
    expect(ids).toEqual([IDS.leadA]);
  });

  it("no ve el lead ni el cliente de otro asesor", async () => {
    await como(db, asesorA, async (tx) => {
      expect(await contar(tx, "select 1 from public.leads where id = $1", [IDS.leadB])).toBe(0);
      expect(await contar(tx, "select 1 from public.clientes where id = $1", [IDS.clienteB])).toBe(0);
    });
  });

  it("ve el cliente de su lead", async () => {
    await como(db, asesorA, async (tx) => {
      expect(await contar(tx, "select 1 from public.clientes where id = $1", [IDS.clienteA])).toBe(1);
    });
  });

  it("no puede editar el lead de otro asesor (no lo encuentra)", async () => {
    const r = await como(db, asesorA, (tx) =>
      tx.query("update public.leads set estado = 'contactado' where id = $1", [IDS.leadB]),
    );
    expect(r.affectedRows).toBe(0);
  });

  it("puede cambiar estado, notas de seguimiento y próximo contacto de su lead", async () => {
    const r = await como(db, asesorA, (tx) =>
      tx.query("update public.leads set estado = 'contactado', proximo_contacto = '2026-12-01' where id = $1", [
        IDS.leadA,
      ]),
    );
    expect(r.affectedRows).toBe(1);
  });

  it("no puede reasignarse el lead a otro asesor", async () => {
    await expect(
      como(db, asesorA, (tx) =>
        tx.query("update public.leads set asesor_id = $1 where id = $2", [IDS.asesorB, IDS.leadA]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("no puede soltar el lead (dejarlo sin asesor)", async () => {
    await expect(
      como(db, asesorA, (tx) => tx.query("update public.leads set asesor_id = null where id = $1", [IDS.leadA])),
    ).rejects.toThrow(/row-level security/);
  });

  for (const [campo, valor] of [
    ["pago_estado", "'anticipo'"],
    ["rango_min", "1"],
    ["operflow_estado", "'lista'"],
    ["configuracion", `'{"forma":"U"}'`],
    ["ciudad", "'Santa Marta'"],
  ] as const) {
    it(`no puede cambiar ${campo} de su lead`, async () => {
      await expect(
        como(db, asesorA, (tx) => tx.query(`update public.leads set ${campo} = ${valor} where id = $1`, [IDS.leadA])),
      ).rejects.toThrow(/Solo gerencia o el sistema/);
    });
  }

  it("no puede crear ni borrar leads", async () => {
    await expect(
      como(db, asesorA, (tx) =>
        tx.query(`insert into public.leads (cliente_id, ciudad, asesor_id) values ($1, 'Barranquilla', $2)`, [
          IDS.clienteA,
          IDS.asesorA,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    const borrado = await como(db, asesorA, (tx) => tx.query("delete from public.leads where id = $1", [IDS.leadA]));
    expect(borrado.affectedRows).toBe(0);
  });

  it("puede dejar notas en su lead, pero no en el de otro ni a nombre de otro", async () => {
    const ok = await como(db, asesorA, (tx) =>
      tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'Llamé')`, [
        IDS.leadA,
        IDS.asesorA,
      ]),
    );
    expect(ok.affectedRows).toBe(1);
    await expect(
      como(db, asesorA, (tx) =>
        tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'x')`, [
          IDS.leadB,
          IDS.asesorA,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      como(db, asesorA, (tx) =>
        tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'x')`, [
          IDS.leadA,
          IDS.asesorB,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("no puede editar ni borrar el historial", async () => {
    await comoGuardando(db, asesorA, (tx) =>
      tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'Fija')`, [
        IDS.leadA,
        IDS.asesorA,
      ]),
    );
    await como(db, asesorA, async (tx) => {
      expect((await tx.query("update public.actividades set detalle = 'cambiada'")).affectedRows).toBe(0);
      expect((await tx.query("delete from public.actividades")).affectedRows).toBe(0);
    });
  });

  it("no puede subirse de rol ni ver otros perfiles", async () => {
    await como(db, asesorA, async (tx) => {
      const r = await tx.query("update public.perfiles set rol = 'gerencia' where id = $1", [IDS.asesorA]);
      expect(r.affectedRows).toBe(0);
      expect(await contar(tx, "select 1 from public.perfiles")).toBe(1);
    });
  });

  it("ve precios pero no puede publicar ni cambiar versiones", async () => {
    await como(db, asesorB, async (tx) => {
      expect(await contar(tx, "select 1 from public.precios_vigentes")).toBe(1);
      expect((await tx.query("update public.precios set datos = '{}'")).affectedRows).toBe(0);
    });
    await expect(
      como(db, asesorB, (tx) =>
        tx.query(`insert into public.precios (ciudad, datos, creado_por) values ('Barranquilla', '{}', $1)`, [
          IDS.asesorB,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("asesor inactivo", () => {
  it("no ve nada, ni siquiera su lead asignado", async () => {
    await como(db, inactivo, async (tx) => {
      expect(await contar(tx, "select 1 from public.leads")).toBe(0);
      expect(await contar(tx, "select 1 from public.clientes")).toBe(0);
      expect(await contar(tx, "select 1 from public.precios")).toBe(0);
    });
  });
});

describe("gerencia", () => {
  it("ve todos los leads y clientes", async () => {
    await como(db, gerencia, async (tx) => {
      expect(await contar(tx, "select 1 from public.leads")).toBe(3);
      expect(await contar(tx, "select 1 from public.clientes")).toBe(2);
      expect(await contar(tx, "select 1 from public.perfiles")).toBe(4);
    });
  });

  it("puede reasignar leads y corregir el estado de pago", async () => {
    const r = await como(db, gerencia, (tx) =>
      tx.query("update public.leads set asesor_id = $1, pago_estado = 'diseno' where id = $2", [
        IDS.asesorB,
        IDS.leadA,
      ]),
    );
    expect(r.affectedRows).toBe(1);
  });

  it("publica precios solo a su nombre y no puede reescribir versiones", async () => {
    const ok = await como(db, gerencia, (tx) =>
      tx.query(`insert into public.precios (ciudad, vigente_desde, datos, creado_por) values ('Santa Marta', '2026-01-01', '{}', $1)`, [
        IDS.gerencia,
      ]),
    );
    expect(ok.affectedRows).toBe(1);
    await expect(
      como(db, gerencia, (tx) =>
        tx.query(`insert into public.precios (ciudad, datos, creado_por) values ('Santa Marta', '{}', $1)`, [
          IDS.asesorA,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await como(db, gerencia, async (tx) => {
      expect((await tx.query("update public.precios set datos = '{}'")).affectedRows).toBe(0);
      expect((await tx.query("delete from public.precios")).affectedRows).toBe(0);
    });
  });
});

describe("sistema (servidor)", () => {
  it("puede registrar el pago del diseño en un lead", async () => {
    const r = await como(db, { tipo: "sistema" }, (tx) =>
      tx.query("update public.leads set pago_estado = 'diseno', estado = 'diseno_pagado' where id = $1", [IDS.leadB]),
    );
    expect(r.affectedRows).toBe(1);
  });

  it("borrar un cliente borra sus leads y actividades (flujo 'no aprobó')", async () => {
    await como(db, { tipo: "sistema" }, async (tx) => {
      await tx.query("delete from public.clientes where id = $1", [IDS.clienteA]);
      expect(await contar(tx, "select 1 from public.leads where cliente_id = $1", [IDS.clienteA])).toBe(0);
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1", [IDS.leadA])).toBe(0);
    });
  });
});
