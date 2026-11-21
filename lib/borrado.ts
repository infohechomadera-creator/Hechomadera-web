/**
 * Borrado de las fotos de un cliente en la cubeta privada `fotos-espacio` (W5).
 * La base borra las filas (`borrar_datos_cliente`), pero los archivos solo los borra el servidor.
 * Se borra todo lo que haya en la carpeta de cada lead del cliente (también fotos huérfanas).
 * Solo servidor; quien llama ya revisó el permiso.
 */
import { clienteSistema } from "@/lib/supabase/servidor";
import { CUBETA_FOTOS } from "@/lib/configurador/guardar";

export async function borrarFotosDelCliente(leadId: string): Promise<boolean> {
  const db = clienteSistema();
  const { data: lead } = await db.from("leads").select("cliente_id").eq("id", leadId).maybeSingle<{ cliente_id: string }>();
  if (!lead) return false;
  const { data: leads } = await db.from("leads").select("id").eq("cliente_id", lead.cliente_id).returns<{ id: string }[]>();

  const rutas = new Set<string>();
  for (const { id } of leads ?? []) {
    const { data: archivos } = await db.from("archivos").select("ruta").eq("lead_id", id).returns<{ ruta: string }[]>();
    for (const a of archivos ?? []) rutas.add(a.ruta);
    const { data: lista, error } = await db.storage.from(CUBETA_FOTOS).list(id, { limit: 100 });
    if (error) return false;
    for (const f of lista ?? []) rutas.add(`${id}/${f.name}`);
  }
  if (!rutas.size) return true;
  const { error } = await db.storage.from(CUBETA_FOTOS).remove([...rutas]);
  if (error) console.error("[borrado] no se pudieron borrar las fotos del lead", leadId.slice(0, 8));
  return !error;
}
