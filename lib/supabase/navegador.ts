"use client";
/** Cliente de Supabase para el navegador (solo con la llave pública). */
import { createBrowserClient } from "@supabase/ssr";

export function clienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publica) throw new Error("Supabase no está configurado");
  return createBrowserClient(url, publica);
}
