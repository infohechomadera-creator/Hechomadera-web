import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { crearBase } from "./entorno";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { validarTablaPrecios } from "@/lib/precios/validar";

it("la semilla SQL aplica sobre las migraciones y coincide con lib/precios/semilla.ts", async () => {
  const db = await crearBase();
  const sql = readFileSync(join(process.cwd(), "supabase", "semillas", "precios_ejemplo.sql"), "utf8");
  await db.exec(sql);
  await db.exec(sql); // se puede correr dos veces sin duplicar
  const filas = (await db.query<{ ciudad: string; datos: unknown }>("select ciudad, datos from public.precios_vigentes order by ciudad")).rows;
  expect(filas.map((f) => f.ciudad)).toEqual(["Barranquilla", "Santa Marta"]);
  for (const f of filas) {
    expect(validarTablaPrecios(f.datos)).toEqual([]);
    expect(f.datos).toEqual(PRECIOS_EJEMPLO[f.ciudad as keyof typeof PRECIOS_EJEMPLO]);
  }
}, 60_000);
