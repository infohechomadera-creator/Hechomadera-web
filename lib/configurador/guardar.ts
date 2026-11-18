/**
 * Guarda un lead del configurador (W3) con la llave del sistema (sin RLS), solo en el servidor.
 * Orden: fotos (en la carpeta del lead, con un id creado aquí) → cliente → lead → registro de fotos.
 * Así el lead solo existe cuando sus fotos ya están arriba. Si algo falla, se deshace lo creado.
 */
import { randomUUID } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/servidor";
import type { Rango } from "@/lib/precios/tipos";
import { AUTORIZACION_VERSION } from "./autorizacion";
import { EXTENSION, type FotoValida } from "./fotos";
import type { SolicitudLead } from "./validar";

export const CUBETA_FOTOS = "fotos-espacio";

type RangoGuardado = { min: number; max: number; ciudad: string };
export type ResultadoGuardar =
  | { ok: true; leadId: string; repetido: false }
  | { ok: true; leadId: string; repetido: true; rango: RangoGuardado }
  | { ok: false };

type Db = ReturnType<typeof clienteSistema>;

/** Lead ya creado con ese envio_id (doble toque o reintento), con el rango que quedó guardado. */
type Repetido = { ok: true; leadId: string; repetido: true; rango: RangoGuardado };

async function buscarRepetido(db: Db, envioId: string): Promise<Repetido | null | "error"> {
  const { data, error } = await db.from("leads").select("id, rango_min, rango_max, ciudad").eq("envio_id", envioId).maybeSingle();
  if (error) return "error";
  if (!data) return null;
  return { ok: true, leadId: data.id, repetido: true, rango: { min: data.rango_min, max: data.rango_max, ciudad: data.ciudad } };
}

/** Para la ruta: ¿ya existe un lead con este envío? (antes de gastar cupo). */
export async function buscarLeadRepetido(envioId: string) {
  return buscarRepetido(clienteSistema(), envioId);
}

export async function guardarLead(solicitud: SolicitudLead, rango: Rango, fotos: FotoValida[]): Promise<ResultadoGuardar> {
  const db = clienteSistema();
  const { configuracion: c, contacto, envio_id } = solicitud;

  const previo = await buscarRepetido(db, envio_id);
  if (previo === "error") return { ok: false };
  if (previo) return previo;

  const leadId = randomUUID();
  const subidas: string[] = [];
  let clienteId: string | null = null;

  /** Deshace lo creado. Si algo no se pudo borrar, queda en el registro del servidor (sin datos personales). */
  const deshacer = async () => {
    if (subidas.length) {
      const { error } = await db.storage.from(CUBETA_FOTOS).remove(subidas);
      if (error) console.error("[configurador] no se pudieron borrar fotos del lead", leadId);
    }
    if (clienteId) {
      const { error } = await db.from("clientes").delete().eq("id", clienteId); // borra en cascada lead y registros
      if (error) console.error("[configurador] no se pudo borrar el cliente del lead", leadId);
    }
  };

  try {
    // 1. Fotos primero, en la carpeta del lead.
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

    // 2. Cliente, con la fecha y la versión de la autorización que aceptó.
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
    if (cliente.error || !cliente.data) {
      await deshacer();
      return { ok: false };
    }
    clienteId = cliente.data.id;

    // 3. Lead, con el rango calculado en el servidor.
    const lead = await db.from("leads").insert({
      id: leadId,
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
    });
    if (lead.error) {
      await deshacer();
      // Otro envío igual ganó la carrera: devolver ese.
      if (lead.error.code === "23505") {
        const ganador = await buscarRepetido(db, envio_id);
        if (ganador && ganador !== "error") return ganador;
      }
      return { ok: false };
    }

    // 4. Registro de las fotos.
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
