/**
 * Clientes de Supabase para el servidor.
 *  - `clienteUsuario()`: actúa como la persona con sesión (gerencia o asesor); respeta RLS.
 *  - `clienteSistema()`: llave secreta, sin RLS. Solo para tareas del servidor
 *    (guardar un lead del configurador, registrar un pago confirmado). Nunca en el navegador.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { configSupabase } from "./config";

export async function clienteUsuario() {
  const { url, publica } = configSupabase();
  if (!url || !publica) throw new Error("Supabase no está configurado");
  const almacen = await cookies();
  return createServerClient(url, publica, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // En componentes de servidor no se pueden escribir cookies; el middleware las renueva.
        }
      },
    },
  });
}

export function clienteSistema() {
  if (typeof window !== "undefined") throw new Error("clienteSistema solo se usa en el servidor");
  const { url } = configSupabase();
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secreta) throw new Error("Supabase no está configurado en el servidor");
  return createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
}
