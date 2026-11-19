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
const SIN_PERFIL = "00000000-0000-4000-a000-0000000000d1";
const GERENCIA_INACTIVA = "00000000-0000-4000-a000-0000000000d2";

const contar = async (tx: { query: PGlite["query"] }, sql: string, params: unknown[] = []) =>
  Number(((await tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params)).rows[0]).n);

beforeAll(async () => {
  db = await crearBase();
  await sembrarPersonas(db);
  await db.query(
    `insert into public.precios (ciudad, vigente_desde, datos, creado_por) values ('Barranquilla', '2026-01-01', '{"v":1}', $1)`,
    [IDS.gerencia],
  );
  // Alguien con sesión pero sin perfil (por si se reactivara el registro libre) y una gerencia inactiva.
  await db.query(`insert into auth.users (id, email) values ($1, 'sin.perfil@prueba.test'), ($2, 'ger.inactiva@prueba.test')`, [
    SIN_PERFIL,
    GERENCIA_INACTIVA,
  ]);
  await db.query(
    `insert into public.perfiles (id, rol, nombre, email, activo) values ($1, 'gerencia', 'Gerencia Inactiva', 'ger.inactiva@prueba.test', false)`,
    [GERENCIA_INACTIVA],
  );
}, 60_000);

describe("público (sin sesión)", () => {
  for (const tabla of ["perfiles", "clientes", "leads", "actividades", "precios", "precios_vigentes"]) {
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
      ).rejects.toThrow(/Solo gerencia o el sistema|lo cambia solo el sistema/);
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
      expect(await contar(tx, "select 1 from public.perfiles")).toBe(5);
    });
  });

  it("puede reasignar leads, pero no cambiar lo que pagó (W5: eso lo hace solo el sistema)", async () => {
    const r = await como(db, gerencia, (tx) =>
      tx.query("update public.leads set asesor_id = $1 where id = $2", [IDS.asesorB, IDS.leadA]),
    );
    expect(r.affectedRows).toBe(1);
    await expect(
      como(db, gerencia, (tx) => tx.query("update public.leads set pago_estado = 'diseno' where id = $1", [IDS.leadA])),
    ).rejects.toThrow(/lo cambia solo el sistema/);
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

describe("versiones de precios", () => {
  it("si gerencia publica dos versiones el mismo día, manda la más reciente", async () => {
    await como(db, gerencia, async (tx) => {
      for (const [n, hora] of [[1, "08:00"], [2, "15:00"]] as const) {
        await tx.query(
          `insert into public.precios (ciudad, vigente_desde, datos, creado_por, creado_at) values ('Barranquilla', '2026-02-01', $1, $2, $3)`,
          [JSON.stringify({ v: n }), IDS.gerencia, `2026-02-01 ${hora}-05`],
        );
      }
      const r = await tx.query<{ datos: { v: number } }>(
        "select datos from public.precios_vigentes where ciudad = 'Barranquilla'",
      );
      expect(r.rows[0].datos.v).toBe(2);
    });
  });

  it("una versión con fecha futura no se aplica antes de tiempo", async () => {
    await como(db, gerencia, async (tx) => {
      await tx.query(
        `insert into public.precios (ciudad, vigente_desde, datos, creado_por) values ('Barranquilla', current_date + 30, '{"v":"futuro"}', $1)`,
        [IDS.gerencia],
      );
      const r = await tx.query<{ datos: { v: unknown } }>(
        "select datos from public.precios_vigentes where ciudad = 'Barranquilla'",
      );
      expect(r.rows[0].datos.v).not.toBe("futuro");
    });
  });
});

describe("registro de integración con Operflow", () => {
  it("el público no lo ve", async () => {
    await expect(como(db, publico, (tx) => tx.query("select * from public.eventos_integracion"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("solo el sistema escribe; gerencia lee; asesor no ve nada", async () => {
    await db.query(`insert into public.eventos_integracion (direccion, mensaje, estado_http) values ('entrada', 'D', 200)`);
    await como(db, gerencia, async (tx) => {
      expect(await contar(tx, "select 1 from public.eventos_integracion")).toBeGreaterThan(0);
    });
    await como(db, asesorA, async (tx) => {
      expect(await contar(tx, "select 1 from public.eventos_integracion")).toBe(0);
    });
    await expect(
      como(db, gerencia, (tx) =>
        tx.query(`insert into public.eventos_integracion (direccion, mensaje) values ('entrada', 'D')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("correcciones del validador (estados, autorización y actividades)", () => {
  for (const estado of ["diseno_pagado", "propuesta_enviada", "aprobado", "no_aprobo"]) {
    it(`un asesor no puede poner su lead en '${estado}'`, async () => {
      await expect(
        como(db, asesorA, (tx) => tx.query(`update public.leads set estado = '${estado}' where id = $1`, [IDS.leadA])),
      ).rejects.toThrow(/Solo gerencia o el sistema|lo cambia solo el sistema/);
    });
  }

  for (const desde of ["diseno_pagado", "aprobado"]) {
    it(`un asesor no saca su lead de '${desde}'`, async () => {
      await expect(
        como(db, asesorA, async (tx) => {
          // Primero el sistema (sin usuario) deja el lead en ese estado…
          await tx.exec("reset role");
          await tx.query("select set_config('request.jwt.claim.sub', '', true)");
          const r = await tx.query(`update public.leads set estado = '${desde}' where id = $1`, [IDS.leadA]);
          expect(r.affectedRows).toBe(1);
          // …y luego el asesor intenta devolverlo.
          await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [IDS.asesorA]);
          await tx.exec("set local role authenticated");
          await tx.query("update public.leads set estado = 'nuevo' where id = $1", [IDS.leadA]);
        }),
      ).rejects.toThrow(/Solo gerencia o el sistema|lo cambia solo el sistema/);
    });
  }

  it("un asesor no cambia el envio_id de su lead", async () => {
    await expect(
      como(db, asesorA, (tx) =>
        tx.query("update public.leads set envio_id = '40000000-0000-4000-a000-0000000000aa' where id = $1", [IDS.leadA]),
      ),
    ).rejects.toThrow(/envío de origen/);
  });

  it("un asesor sí puede marcar su lead como perdido", async () => {
    const r = await como(db, asesorA, (tx) => tx.query("update public.leads set estado = 'perdido' where id = $1", [IDS.leadA]));
    expect(r.affectedRows).toBe(1);
  });

  it("gerencia tampoco pone a mano un estado del sistema (W5)", async () => {
    await expect(
      como(db, gerencia, (tx) => tx.query("update public.leads set estado = 'aprobado' where id = $1", [IDS.leadA])),
    ).rejects.toThrow(/lo cambia solo el sistema/);
    const r = await como(db, gerencia, (tx) => tx.query("update public.leads set estado = 'perdido' where id = $1", [IDS.leadA]));
    expect(r.affectedRows).toBe(1);
  });

  it("un asesor corrige el teléfono de su cliente, pero no la autorización de datos", async () => {
    const ok = await como(db, asesorA, (tx) =>
      tx.query("update public.clientes set telefono = '3000000099' where id = $1", [IDS.clienteA]),
    );
    expect(ok.affectedRows).toBe(1);
    for (const cambio of ["autorizacion_datos_at = now() - interval '1 year'", "autorizacion_version = 'v0'", "creado_at = now()"]) {
      await expect(
        como(db, asesorA, (tx) => tx.query(`update public.clientes set ${cambio} where id = $1`, [IDS.clienteA])),
      ).rejects.toThrow(/autorización de datos/);
    }
  });

  it("un asesor no puede editar el cliente de otro asesor", async () => {
    const r = await como(db, asesorA, (tx) => tx.query("update public.clientes set nombre = 'X' where id = $1", [IDS.clienteB]));
    expect(r.affectedRows).toBe(0);
  });

  it("un asesor no puede registrar actividades de pago ni de Operflow", async () => {
    for (const tipo of ["pago", "operflow", "asignacion"]) {
      await expect(
        como(db, asesorA, (tx) =>
          tx.query(`insert into public.actividades (lead_id, autor_id, tipo, detalle) values ($1, $2, $3, 'x')`, [
            IDS.leadA,
            IDS.asesorA,
            tipo,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
    }
  });

  it("un asesor no ve las actividades del lead de otro asesor", async () => {
    await db.query(`insert into public.actividades (lead_id, tipo, detalle) values ($1, 'nota', 'De B')`, [IDS.leadB]);
    await como(db, asesorA, async (tx) => {
      expect(await contar(tx, "select 1 from public.actividades where lead_id = $1", [IDS.leadB])).toBe(0);
    });
  });

  for (const [nombre, id] of [
    ["gerencia inactiva", GERENCIA_INACTIVA],
    ["usuario con sesión pero sin perfil", SIN_PERFIL],
  ] as const) {
    it(`${nombre} no ve ni cambia nada`, async () => {
      await como(db, { tipo: "usuario", id }, async (tx) => {
        // Solo su propio perfil (el login lo lee para saber que está inactivo).
        expect(await contar(tx, "select 1 from public.perfiles where id <> $1", [id])).toBe(0);
        for (const tabla of ["clientes", "leads", "actividades", "precios", "precios_vigentes", "eventos_integracion"]) {
          expect(await contar(tx, `select 1 from public.${tabla}`)).toBe(0);
        }
        expect((await tx.query("update public.leads set estado = 'contactado'")).affectedRows).toBe(0);
      });
    });
  }

  it("nadie con sesión puede vaciar una tabla de un golpe", async () => {
    await expect(como(db, gerencia, (tx) => tx.query("truncate public.actividades"))).rejects.toThrow(/permission denied/);
  });
});

describe("W3 · fotos del espacio (archivos) y envíos", () => {
  const FOTO_A = "30000000-0000-4000-a000-00000000000a";
  const FOTO_B = "30000000-0000-4000-a000-00000000000b";
  const ruta = (lead: string, foto: string) => `${lead}/${foto}.jpg`;

  beforeAll(async () => {
    await db.query(
      `insert into public.archivos (id, lead_id, ruta, tipo, bytes) values
        ($1, $2, $3, 'image/jpeg', 1000), ($4, $5, $6, 'image/jpeg', 1000)`,
      [FOTO_A, IDS.leadA, ruta(IDS.leadA, FOTO_A), FOTO_B, IDS.leadB, ruta(IDS.leadB, FOTO_B)],
    );
  });

  it("el público no ve ni sube fotos", async () => {
    await expect(como(db, publico, (tx) => tx.query("select * from public.archivos"))).rejects.toThrow(/permission denied/);
    await expect(
      como(db, publico, (tx) =>
        tx.query(`insert into public.archivos (lead_id, ruta, tipo, bytes) values ($1, $2, 'image/jpeg', 10)`, [
          IDS.leadA,
          ruta(IDS.leadA, "30000000-0000-4000-a000-0000000000ff"),
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un asesor ve solo las fotos de sus leads", async () => {
    const ids = await como(db, asesorA, async (tx) =>
      (await tx.query<{ id: string }>("select id from public.archivos")).rows.map((r) => r.id),
    );
    expect(ids).toEqual([FOTO_A]);
  });

  it("gerencia ve todas las fotos", async () => {
    await como(db, gerencia, async (tx) => {
      expect(await contar(tx, "select 1 from public.archivos")).toBe(2);
    });
  });

  for (const [nombre, quien] of [
    ["asesor", asesorA],
    ["gerencia", gerencia],
  ] as const) {
    it(`${nombre} no registra, cambia ni borra fotos directamente (solo el servidor)`, async () => {
      await expect(
        como(db, quien, (tx) =>
          tx.query(`insert into public.archivos (lead_id, ruta, tipo, bytes) values ($1, $2, 'image/jpeg', 10)`, [
            IDS.leadA,
            ruta(IDS.leadA, "30000000-0000-4000-a000-0000000000fe"),
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
      await como(db, quien, async (tx) => {
        expect((await tx.query("update public.archivos set bytes = 2")).affectedRows).toBe(0);
        expect((await tx.query("delete from public.archivos")).affectedRows).toBe(0);
      });
    });
  }

  for (const [nombre, id] of [
    ["asesor inactivo", IDS.asesorInactivo],
    ["gerencia inactiva", GERENCIA_INACTIVA],
    ["usuario sin perfil", SIN_PERFIL],
  ] as const) {
    it(`${nombre} no ve fotos`, async () => {
      await como(db, { tipo: "usuario", id }, async (tx) => {
        expect(await contar(tx, "select 1 from public.archivos")).toBe(0);
      });
    });
  }

  it("la ruta de una foto no admite rutas raras, otros tipos ni la carpeta de otro lead", async () => {
    for (const r of ["../otro/archivo.jpg", `${IDS.leadA}/foto.exe`, "/abs/x.jpg", `${IDS.leadB}/30000000-0000-4000-a000-0000000000f1.jpg`]) {
      await expect(
        db.query(`insert into public.archivos (lead_id, ruta, tipo, bytes) values ($1, $2, 'image/jpeg', 10)`, [IDS.leadA, r]),
      ).rejects.toThrow(/check constraint/);
    }
  });

  it("un envío repetido (mismo envio_id) no crea otro lead", async () => {
    const envio = "40000000-0000-4000-a000-000000000001";
    await como(db, { tipo: "sistema" }, async (tx) => {
      await tx.query(`insert into public.leads (cliente_id, ciudad, envio_id) values ($1, 'Barranquilla', $2)`, [IDS.clienteA, envio]);
      await expect(
        tx.query(`insert into public.leads (cliente_id, ciudad, envio_id) values ($1, 'Barranquilla', $2)`, [IDS.clienteA, envio]),
      ).rejects.toThrow(/duplicate key/);
    });
  });

  it("la cubeta fotos-espacio es privada y solo acepta imágenes", async () => {
    const r = await db.query<{ public: boolean; allowed_mime_types: string[] }>(
      "select public, allowed_mime_types from storage.buckets where id = 'fotos-espacio'",
    );
    expect(r.rows[0].public).toBe(false);
    expect(r.rows[0].allowed_mime_types).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  it("borrar el cliente borra el registro de sus fotos", async () => {
    await como(db, { tipo: "sistema" }, async (tx) => {
      await tx.query("delete from public.clientes where id = $1", [IDS.clienteB]);
      expect(await contar(tx, "select 1 from public.archivos where lead_id = $1", [IDS.leadB])).toBe(0);
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
