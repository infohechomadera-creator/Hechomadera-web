/**
 * Configuración de Supabase (proyecto "hechomadera", solo de la web).
 * Las llaves viven en .env.local y en Vercel; nunca en el código.
 */
export function configSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, publica, lista: Boolean(url && publica) };
}

/** ¿Está conectada la base? Si no, la web sigue funcionando con lo que ya existe. */
export const supabaseConfigurado = () => configSupabase().lista;
