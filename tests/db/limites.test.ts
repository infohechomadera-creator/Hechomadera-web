/** Contador de intentos en Supabase (reemplaza Upstash Redis): cuenta por clave y solo lo usa el servidor. */
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { IDS, como, crearBase, sembrarPersonas } from "./entorno";

let db: PGlite;
const clave = "a".repeat(64);
const otra = "b".repeat(64);

beforeAll(async () => {
  db = await crearBase();
  await sembrarPersonas(db);
}, 60_000);

describe("contar_intento", () => {
  it("deja pasar hasta el límite y luego frena, por clave", async () => {
    await como(db, { tipo: "sistema" }, async (tx) => {
      const intento = async (k: string) =>
        (await tx.query<{ r: boolean }>(`select public.contar_intento('${k}', 60, 3) as r`)).rows[0].r;
      expect([await intento(clave), await intento(clave), await intento(clave)]).toEqual([true, true, true]);
      expect(await intento(clave)).toBe(false);
      expect(await intento(otra)).toBe(true);
    });
  });

  it("una clave que no es una huella no se guarda", async () => {
    await como(db, { tipo: "sistema" }, async (tx) => {
      await tx.query("select public.contar_intento('203.0.113.7', 60, 3)");
      expect((await tx.query<{ n: number }>("select count(*)::int as n from public.limites")).rows[0].n).toBe(0);
    });
  });

  it("con sesión nadie ejecuta la función ni ve la tabla", async () => {
    for (const quien of [{ tipo: "publico" } as const, { tipo: "usuario", id: IDS.gerencia } as const]) {
      await expect(como(db, quien, (tx) => tx.query(`select public.contar_intento('${clave}', 60, 3)`))).rejects.toThrow(/permission denied/);
      await expect(como(db, quien, (tx) => tx.query("select * from public.limites"))).rejects.toThrow(/permission denied/);
    }
  });
});
