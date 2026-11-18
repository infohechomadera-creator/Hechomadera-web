/**
 * Pruebas de permisos del CRM (W4) sobre las migraciones reales.
 * El asesor solo trabaja sus leads; el historial de estados y asignaciones lo escribe la base.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { IDS, como, comoGuardando, crearBase, sembrarPersonas } from "./entorno";

let db: PGlite;

const gerencia = { tipo: "usuario", id: IDS.gerencia } as const;
const asesorA = { tipo: "usuario", id: IDS.asesorA } as const;
const asesorB = { tipo: "usuario", id: IDS.asesorB } as const;
const publico = { tipo: "publico" } as const;
const SIN_PERFIL = "00000000-0000-4000-a000-0000000000d1";
const RUTA_B = `${IDS.leadB}/30000000-0000-4000-a000-00000000000b.jpg`;

const contar = async (tx: { query: PGlite["query"] }, sql: string, params: unknown[] = []) =>
  Number(((await tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params)).rows[0]).n);

beforeAll(async () => {
  db = await crearBase();
  await sembrarPersonas(db);
  await db.query(`insert into auth.users (id, email) values ($1, 'sin.perfil@prueba.test')`, [SIN_PERFIL]);
  // Una foto y una nota en el lead del asesor B (las pone el sistema).
  await db.query(`insert into public.archivos (lead_id, ruta, tipo, bytes) values ($1, $2, 'image/jpeg', 1000)`, [
    IDS.leadB,
    RUTA_B,
  ]);
  await db.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'Nota de B')`, [
    IDS.leadB,
    IDS.asesorB,
  ]);
}, 60_000);

describe("asesor y leads ajenos", () => {
  it("no ve las notas ni las fotos del lead de otro asesor", async () => {
    await como(db, asesorA, async (tx) => {
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1", [IDS.leadB])).toBe(0);
      expect(await contar(tx, "select 1 from public.archivos where lead_id = $1", [IDS.leadB])).toBe(0);
    });
    await como(db, asesorB, async (tx) => {
      expect(await contar(tx, "select 1 from public.archivos where lead_id = $1", [IDS.leadB])).toBe(1);
    });
  });

  it("cuando gerencia le quita el lead, deja de ver el lead, el cliente, las notas y las fotos", async () => {
    await como(db, gerencia, async (tx) => {
      await tx.query("update public.leads set asesor_id = $1 where id = $2", [IDS.asesorA, IDS.leadB]);
      await tx.exec(`select set_config('request.jwt.claim.sub', '${IDS.asesorB}', true)`);
      expect(await contar(tx, "select 1 from public.leads where id = $1", [IDS.leadB])).toBe(0);
      expect(await contar(tx, "select 1 from public.clientes where id = $1", [IDS.clienteB])).toBe(0);
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1", [IDS.leadB])).toBe(0);
      expect(await contar(tx, "select 1 from public.archivos where lead_id = $1", [IDS.leadB])).toBe(0);
      await tx.exec(`select set_config('request.jwt.claim.sub', '${IDS.asesorA}', true)`);
      expect(await contar(tx, "select 1 from public.archivos where lead_id = $1", [IDS.leadB])).toBe(1);
    });
  });
});

describe("historial automático", () => {
  it("el cambio de estado del asesor deja una actividad a su nombre", async () => {
    await como(db, asesorA, async (tx) => {
      await tx.query("update public.leads set estado = 'contactado' where id = $1", [IDS.leadA]);
      const r = await tx.query<{ autor_id: string; detalle: string }>(
        "select autor_id, detalle from public.actividades where lead_id = $1 and tipo = 'cambio_estado'",
        [IDS.leadA],
      );
      expect(r.rows).toEqual([{ autor_id: IDS.asesorA, detalle: "Nuevo → Contactado" }]);
    });
  });

  it("poner próximo contacto no deja actividad de estado", async () => {
    await como(db, asesorA, async (tx) => {
      await tx.query("update public.leads set proximo_contacto = '2026-12-01' where id = $1", [IDS.leadA]);
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1", [IDS.leadA])).toBe(0);
    });
  });

  it("la asignación de gerencia deja una actividad con el nombre del asesor", async () => {
    await como(db, gerencia, async (tx) => {
      await tx.query("update public.leads set asesor_id = $1 where id = $2", [IDS.asesorB, IDS.leadA]);
      await tx.query("update public.leads set asesor_id = null where id = $1", [IDS.leadA]);
      const r = await tx.query<{ autor_id: string; detalle: string }>(
        "select autor_id, detalle from public.actividades where lead_id = $1 and tipo = 'asignacion' order by creado_at, detalle",
        [IDS.leadA],
      );
      expect(r.rows.map((x) => x.detalle).sort()).toEqual(["Asignado a Asesor B", "Quedó sin asesor"]);
      expect(r.rows.every((x) => x.autor_id === IDS.gerencia)).toBe(true);
    });
  });

  it("el asesor no puede escribir a mano cambios de estado ni asignaciones", async () => {
    for (const tipo of ["cambio_estado", "asignacion", "pago", "operflow"]) {
      await expect(
        como(db, asesorA, (tx) =>
          tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, $3, 'falso')`, [
            IDS.leadA,
            IDS.asesorA,
            tipo,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
    }
  });

  it("el asesor sigue pudiendo dejar notas en su lead", async () => {
    const r = await como(db, asesorA, (tx) =>
      tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'Llamé')`, [
        IDS.leadA,
        IDS.asesorA,
      ]),
    );
    expect(r.affectedRows).toBe(1);
  });

  it("el asesor no puede mover el lead a un estado de pago ni a 'no aprobó'", async () => {
    for (const estado of ["diseno_pagado", "aprobado", "no_aprobo"]) {
      await expect(
        como(db, asesorA, (tx) => tx.query(`update public.leads set estado = $1 where id = $2`, [estado, IDS.leadA])),
      ).rejects.toThrow(/Solo gerencia o el sistema/);
    }
  });
});

describe("asignación", () => {
  it("gerencia no puede asignar a alguien inactivo ni inexistente", async () => {
    for (const id of [IDS.asesorInactivo, SIN_PERFIL]) {
      await expect(
        como(db, gerencia, (tx) => tx.query("update public.leads set asesor_id = $1 where id = $2", [id, IDS.leadA])),
      ).rejects.toThrow(/persona activa del equipo|foreign key/);
    }
  });

  it("un lead que ya estaba con alguien inactivo se puede editar sin reasignarlo", async () => {
    const r = await como(db, gerencia, (tx) =>
      tx.query("update public.leads set proximo_contacto = '2026-12-02' where asesor_id = $1", [IDS.asesorInactivo]),
    );
    expect(r.affectedRows).toBe(1);
  });
});

describe("nombres del equipo", () => {
  it("el asesor ve los nombres del equipo, pero no sus correos ni roles", async () => {
    await como(db, asesorA, async (tx) => {
      const r = await tx.query<{ id: string; nombre: string }>("select * from public.nombres_equipo()");
      expect(r.rows.length).toBe(4);
      expect(Object.keys(r.rows[0]).sort()).toEqual(["id", "nombre"]);
    });
  });

  it("el público no puede usarla y alguien sin perfil no ve nada", async () => {
    await expect(como(db, publico, (tx) => tx.query("select * from public.nombres_equipo()"))).rejects.toThrow(
      /permission denied/,
    );
    await como(db, { tipo: "usuario", id: SIN_PERFIL }, async (tx) => {
      expect(await contar(tx, "select * from public.nombres_equipo()")).toBe(0);
    });
  });
});

describe("el asesor no se salta las reglas guardando", () => {
  it("las notas guardadas quedan fijas", async () => {
    await comoGuardando(db, asesorA, (tx) =>
      tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, 'nota', 'Fija')`, [
        IDS.leadA,
        IDS.asesorA,
      ]),
    );
    await como(db, asesorA, async (tx) => {
      expect((await tx.query("update public.actividades set detalle = 'otra'")).affectedRows).toBe(0);
      expect((await tx.query("delete from public.actividades")).affectedRows).toBe(0);
    });
  });
});
