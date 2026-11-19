/**
 * Base Postgres local (PGlite) que imita lo que Supabase trae de fábrica:
 * esquema `auth`, función `auth.uid()`, roles `anon` y `authenticated` y los
 * permisos por defecto sobre `public`. Luego aplica las migraciones reales.
 * Todo vive en memoria: las personas ficticias desaparecen al terminar la prueba.
 */
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRACIONES = join(process.cwd(), "supabase", "migrations");

const IMITACION_SUPABASE = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  -- Almacenamiento de Supabase (solo lo que usan las migraciones).
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Supabase concede por defecto todo sobre public a anon y authenticated; RLS decide.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

export async function crearBase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(IMITACION_SUPABASE);
  const archivos = readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql")).sort();
  for (const archivo of archivos) {
    await db.exec(readFileSync(join(MIGRACIONES, archivo), "utf8"));
  }
  return db;
}

export type Quien = { tipo: "publico" } | { tipo: "usuario"; id: string } | { tipo: "sistema" };

/** Ejecuta `fn` como esa persona, dentro de una transacción que se deshace al final. */
export async function como<T>(db: PGlite, quien: Quien, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultado!: T;
  let error: unknown;
  await db
    .transaction(async (tx) => {
      if (quien.tipo === "publico") {
        await tx.exec("set local role anon");
      } else if (quien.tipo === "usuario") {
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [quien.id]);
        await tx.exec("set local role authenticated");
      }
      try {
        resultado = await fn(tx);
      } catch (e) {
        error = e;
      }
      await tx.rollback();
    })
    .catch(() => undefined);
  if (error) throw error;
  return resultado;
}

/** Igual que `como`, pero guarda los cambios (para preparar datos). */
export async function comoGuardando<T>(db: PGlite, quien: Quien, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (quien.tipo === "usuario") {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [quien.id]);
      await tx.exec("set local role authenticated");
    } else if (quien.tipo === "publico") {
      await tx.exec("set local role anon");
    }
    return fn(tx);
  });
}

export const IDS = {
  gerencia: "00000000-0000-4000-a000-000000000001",
  asesorA: "00000000-0000-4000-a000-00000000000a",
  asesorB: "00000000-0000-4000-a000-00000000000b",
  asesorInactivo: "00000000-0000-4000-a000-00000000000c",
  clienteA: "10000000-0000-4000-a000-00000000000a",
  clienteB: "10000000-0000-4000-a000-00000000000b",
  leadA: "20000000-0000-4000-a000-00000000000a",
  leadB: "20000000-0000-4000-a000-00000000000b",
} as const;

/** Personas ficticias: gerencia, asesor A, asesor B, asesor inactivo y un lead por asesor. */
export async function sembrarPersonas(db: PGlite): Promise<void> {
  await db.exec(`
    insert into auth.users (id, email) values
      ('${IDS.gerencia}', 'gerencia@prueba.test'),
      ('${IDS.asesorA}', 'asesor.a@prueba.test'),
      ('${IDS.asesorB}', 'asesor.b@prueba.test'),
      ('${IDS.asesorInactivo}', 'inactivo@prueba.test');
    insert into public.perfiles (id, rol, nombre, email, activo) values
      ('${IDS.gerencia}', 'gerencia', 'Gerencia Prueba', 'gerencia@prueba.test', true),
      ('${IDS.asesorA}', 'asesor', 'Asesor A', 'asesor.a@prueba.test', true),
      ('${IDS.asesorB}', 'asesor', 'Asesor B', 'asesor.b@prueba.test', true),
      ('${IDS.asesorInactivo}', 'asesor', 'Asesor Inactivo', 'inactivo@prueba.test', false);
    insert into public.clientes (id, nombre, telefono, ciudad, autorizacion_datos_at, autorizacion_version) values
      ('${IDS.clienteA}', 'Cliente A', '3000000001', 'Barranquilla', now(), 'v1'),
      ('${IDS.clienteB}', 'Cliente B', '3000000002', 'Santa Marta', now(), 'v1');
    insert into public.leads (id, cliente_id, ciudad, asesor_id, rango_min, rango_max) values
      ('${IDS.leadA}', '${IDS.clienteA}', 'Barranquilla', '${IDS.asesorA}', 10000000, 14000000),
      ('${IDS.leadB}', '${IDS.clienteB}', 'Santa Marta', '${IDS.asesorB}', 12000000, 16000000);
  `);
  // Un lead asignado al asesor inactivo: no debe poder verlo.
  await db.exec(`
    insert into public.leads (cliente_id, ciudad, asesor_id) values
      ('${IDS.clienteA}', 'Barranquilla', '${IDS.asesorInactivo}');
  `);
}
