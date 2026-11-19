import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { obtenerPrecios } from "@/lib/precios/fuente";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import { LIMITES_CHARLA, firmaValida, firmarHistorial, turnosDelCliente, validarHistorial, validarMensaje } from "@/lib/agente/guardia";
import { leerEstado } from "@/lib/agente/herramientas";
import { MENSAJE_SIN_SERVICIO, SinCupo, agenteActivo, clienteAnthropic, conversar } from "@/lib/agente/conversar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Mensajes por IP y hora. */
const LIMITE_POR_IP_HORA = 40;
/** Llamadas a la IA de todo el sitio por día (cada mensaje usa de 1 a 5). Tope propio, además del tope mensual de Anthropic. */
const LIMITE_LLAMADAS_DIA = 1500;

const sinCache = { "Cache-Control": "no-store" };
const responder = (estado: number, cuerpo: object) => NextResponse.json(cuerpo, { status: estado, headers: sinCache });
const REINICIAR = { error: "No pude seguir esta conversación. Empecemos de nuevo o sigue con el formulario.", reiniciar: true };

/**
 * POST /api/configurador/agente (público). JSON:
 *   historial  la conversación que devolvió esta API la vez anterior (tal cual)
 *   firma      la firma que devolvió esta API para ese historial
 *   mensaje    lo nuevo que escribió el cliente
 *   estado     lo que tiene el configurador (ciudad, forma, diseño, color, herrajes, electrodomésticos, medidas_m, tiene_contacto)
 * Devuelve el texto del agente, el historial completo con su firma, el estado para el configurador
 * y, si se calculó, el rango (lo calcula el servidor, nunca la IA). No guarda nada ni crea el lead.
 * Si no se puede contar el uso (Supabase caído), no atiende: el formulario sigue funcionando sin la IA.
 */
export async function POST(request: Request) {
  if (!agenteActivo()) return responder(503, { error: MENSAJE_SIN_SERVICIO, apagado: true });

  let datos: Record<string, unknown>;
  try {
    const leido = await request.json();
    datos = leido && typeof leido === "object" ? leido : {};
  } catch {
    return responder(400, { error: "Datos no válidos" });
  }

  const mensaje = validarMensaje(datos.mensaje);
  if (!mensaje.ok) return responder(400, { error: mensaje.error });
  const crudo = datos.historial ?? [];
  if (!Array.isArray(crudo) || !firmaValida(crudo, datos.firma)) return responder(400, REINICIAR);
  const historial = validarHistorial(crudo);
  if (!historial.ok) return responder(400, { error: historial.error, reiniciar: true });
  if (turnosDelCliente(historial.valor) >= LIMITES_CHARLA.turnos) {
    return responder(429, { error: "Llegamos al máximo de mensajes de esta conversación. Sigue con el formulario o empieza de nuevo.", reiniciar: true });
  }

  const ip = ipDe(request);
  if (!(await dentroDelLimite(`agente-ip:${ip}`, LIMITE_POR_IP_HORA, 3600, false))) {
    return responder(429, { error: "Muchos mensajes seguidos. Espera un rato o sigue con el formulario." });
  }

  const { tablas } = await obtenerPrecios();
  const estado = leerEstado(datos.estado, tablas);

  try {
    const r = await conversar({
      cliente: clienteAnthropic(),
      historial: historial.valor,
      mensaje: mensaje.valor,
      estado,
      tablas,
      permitirLlamada: () => dentroDelLimite("agente-llamadas:dia", LIMITE_LLAMADAS_DIA, 86_400, false),
    });
    const completo = [...historial.valor, ...r.nuevos];
    return responder(200, {
      ok: true,
      texto: r.texto,
      historial: completo,
      firma: firmarHistorial(completo),
      estado: r.estado,
      rango: r.rango,
      contacto: r.contacto,
    });
  } catch (e) {
    if (e instanceof SinCupo) return responder(503, { error: MENSAJE_SIN_SERVICIO });
    // Se registra solo el tipo de error, nunca el contenido de la conversación.
    console.error("[agente] error de la API de Anthropic", e instanceof Anthropic.APIError ? `${e.status ?? "sin estado"} ${e.name}` : e instanceof Error ? e.name : "desconocido");
    if (e instanceof Anthropic.BadRequestError) return responder(400, REINICIAR); // historial que la API no acepta, o sin saldo
    if (e instanceof Anthropic.RateLimitError) return responder(503, { error: "El asistente está ocupado. Intenta en un momento o sigue con el formulario." });
    return responder(503, { error: MENSAJE_SIN_SERVICIO });
  }
}
