import { NextResponse } from "next/server";
import { ErrorPrecio, calcularRango } from "@/lib/precios/calcular";
import { obtenerPrecios } from "@/lib/precios/fuente";
import { validarSolicitud } from "@/lib/configurador/validar";
import { validarFotos } from "@/lib/configurador/fotos";
import { buscarLeadRepetido, guardarLead } from "@/lib/configurador/guardar";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import { sendNewLeadAlertToSeller } from "@/lib/email-notifications";
import { DISENOS_COCINA, FORMAS_COCINA } from "@/content/cocinas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toda solicitud por IP y hora (incluye las que tienen errores al escribir). */
const LIMITE_INTENTOS_POR_HORA = 30;
/** Envíos válidos por IP y hora (varios clientes pueden compartir IP en redes móviles). */
const LIMITE_LEADS_POR_HORA = 8;
/**
 * Envíos con fotos de todo el sitio por hora. Al pasarlo NO se rechaza al cliente (así nadie puede
 * bloquear el formulario): el lead se guarda sin fotos, que son lo que llena el almacenamiento.
 */
const LIMITE_FOTOS_GLOBAL_POR_HORA = 60;
const MUCHAS = { error: "Ya recibimos varias solicitudes desde aquí. Intenta más tarde o escríbenos por WhatsApp." };
const sinCache = { "Cache-Control": "no-store" };
const responder = (estado: number, cuerpo: object) => NextResponse.json(cuerpo, { status: estado, headers: sinCache });

/**
 * POST /api/configurador/lead (público, multipart/form-data):
 *   datos      JSON con configuracion, contacto, autorizacion { acepta, version } y envio_id
 *   fotos      0 a 5 imágenes (ya reducidas por el navegador)
 *   sitio_web  campo oculto anti-bots (debe ir vacío)
 * El rango se recalcula aquí; cualquier monto que mande el navegador se ignora.
 */
export async function POST(request: Request) {
  const ip = ipDe(request);
  if (!(await dentroDelLimite(`config-intento:${ip}`, LIMITE_INTENTOS_POR_HORA, 3600))) return responder(429, MUCHAS);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return responder(400, { error: "Datos no válidos" });
  }
  // Trampa anti-bots: responde como si todo saliera bien, sin guardar nada.
  if (String(form.get("sitio_web") ?? "")) return responder(200, { ok: true, referencia: null });

  let datos: unknown;
  try {
    datos = JSON.parse(String(form.get("datos") ?? ""));
  } catch {
    return responder(400, { error: "Datos no válidos" });
  }

  const { tablas } = await obtenerPrecios();
  const solicitud = validarSolicitud(datos, tablas);
  if (!solicitud.ok) return responder(400, { error: solicitud.error, campo: solicitud.campo });

  const archivos = form.getAll("fotos").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);
  const fotos = await validarFotos(archivos);
  if (!fotos.ok) return responder(400, { error: fotos.error, campo: "fotos" });

  // Un reintento del mismo envío (se cayó la señal) responde con lo guardado, sin gastar cupo.
  const repetido = await buscarLeadRepetido(solicitud.valor.envio_id);
  if (repetido === "error") return responder(500, { error: "No pudimos guardar tu solicitud. Intenta de nuevo en un momento." });
  if (repetido) return responder(200, { ok: true, referencia: repetido.leadId.slice(0, 8).toUpperCase(), rango: repetido.rango });

  // Solo los envíos válidos y nuevos gastan el cupo estricto por IP.
  if (!(await dentroDelLimite(`config-lead:${ip}`, LIMITE_LEADS_POR_HORA, 3600))) return responder(429, MUCHAS);
  const fotosAGuardar =
    fotos.fotos.length && !(await dentroDelLimite("config-fotos:global", LIMITE_FOTOS_GLOBAL_POR_HORA, 3600)) ? [] : fotos.fotos;

  const c = solicitud.valor.configuracion;
  let rango;
  try {
    rango = calcularRango(tablas[c.ciudad], c);
  } catch (e) {
    if (e instanceof ErrorPrecio) return responder(400, { error: e.message, campo: e.campo });
    return responder(500, { error: "No pudimos calcular el rango" });
  }

  const guardado = await guardarLead(solicitud.valor, rango, fotosAGuardar);
  if (!guardado.ok) return responder(500, { error: "No pudimos guardar tu solicitud. Intenta de nuevo en un momento." });

  if (!guardado.repetido) {
    const forma = FORMAS_COCINA.find((f) => f.id === c.forma)?.nombre ?? c.forma;
    const diseno = DISENOS_COCINA.find((d) => d.id === c.diseno)?.nombre ?? c.diseno;
    await sendNewLeadAlertToSeller({
      leadId: guardado.leadId,
      nombre: solicitud.valor.contacto.nombre,
      ciudad: c.ciudad,
      resumen: `Cocina ${forma.toLowerCase()} · ${diseno} · ${fotosAGuardar.length} foto(s)${fotosAGuardar.length < fotos.fotos.length ? " (fotos no guardadas por exceso de envíos; pídelas por WhatsApp)" : ""}`,
      rangoMin: rango.min,
      rangoMax: rango.max,
    }).catch(() => undefined);
  }

  return responder(200, {
    ok: true,
    referencia: guardado.leadId.slice(0, 8).toUpperCase(),
    // En un envío repetido se devuelve el rango que quedó guardado, no el de este intento.
    rango: guardado.repetido ? guardado.rango : { min: rango.min, max: rango.max, ciudad: rango.ciudad },
  });
}
