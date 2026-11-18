/**
 * Guarda un lead del configurador (W3) con la llave del sistema (sin RLS), solo en el servidor.
 * Orden: cliente → lead → fotos → registro de fotos. Si algo falla a mitad, deshace lo creado.
 */
import { randomUUID } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/servidor";
import type { Rango } from "@/lib/precios/tipos";
import { AUTORIZACION_VERSION } from "./autorizacion";
import { EXTENSION, type FotoValida } from "./fotos";
import type { SolicitudLead } from "./validar";

export const CUBETA_FOTOS = "fotos-espacio";

export type ResultadoGuardar = { ok: true; leadId: string; repetido: boolean } | { ok: false };

export async function guardarLead(solicitud: SolicitudLead, rango: Rango, fotos: FotoValida[]): Promise<ResultadoGuardar> {
  const db = clienteSistema();
  const { configuracion: c, contacto, envio_id } = solicitud;

  // Envío repetido (doble toque o reintento): devuelve el lead que ya existe.
  const previo = await db.from("leads").select("id").eq("envio_id", envio_id).maybeSingle();
  if (previo.error) return { ok: false };
  if (previo.data) return { ok: true, leadId: previo.data.id, repetido: true };

  const cliente = await db
    .from("clientes")
    .insert({
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      email: contacto.email,
      ciudad: c.ciudad,
      autorizacion_datos_at: new Date().toISOString(),
      autorizacion_version: AUTORIZACION_VERSION,
    })
    .select("id")
    .single();
  if (cliente.error || !cliente.data) return { ok: false };
  const clienteId: string = cliente.data.id;
  const subidas: string[] = [];

  const deshacer = async () => {
    if (subidas.length) await db.storage.from(CUBETA_FOTOS).remove(subidas);
    await db.from("clientes").delete().eq("id", clienteId); // borra en cascada lead y registros de fotos
  };

  try {
    const lead = await db
      .from("leads")
      .insert({
        cliente_id: clienteId,
        producto: "cocina",
        ciudad: c.ciudad,
        envio_id,
        rango_min: rango.min,
        rango_max: rango.max,
        configuracion: {
          origen: "configurador",
          forma: c.forma,
          diseno: c.diseno,
          color: c.color,
          herrajes: c.herrajes,
          electrodomesticos: c.electrodomesticos,
          medidas_mm: c.medidas_mm,
          precios_vigente_desde: rango.vigente_desde,
          metros_lineales: rango.metros_lineales,
          metros_isla: rango.metros_isla,
        },
      })
      .select("id")
      .single();
    if (lead.error || !lead.data) {
      await deshacer();
      // Otro envío igual ganó la carrera: devolver ese.
      if (lead.error?.code === "23505") {
        const ganador = await db.from("leads").select("id").eq("envio_id", envio_id).maybeSingle();
        if (ganador.data) return { ok: true, leadId: ganador.data.id, repetido: true };
      }
      return { ok: false };
    }
    const leadId: string = lead.data.id;

    const filas = [];
    for (const foto of fotos) {
      const ruta = `${leadId}/${randomUUID()}.${EXTENSION[foto.tipo]}`;
      const subida = await db.storage.from(CUBETA_FOTOS).upload(ruta, foto.bytes, { contentType: foto.tipo, upsert: false });
      if (subida.error) {
        await deshacer();
        return { ok: false };
      }
      subidas.push(ruta);
      filas.push({ lead_id: leadId, ruta, tipo: foto.tipo, bytes: foto.bytes.length });
    }
    if (filas.length) {
      const registro = await db.from("archivos").insert(filas);
      if (registro.error) {
        await deshacer();
        return { ok: false };
      }
    }
    return { ok: true, leadId, repetido: false };
  } catch {
    await deshacer().catch(() => undefined);
    return { ok: false };
  }
}
