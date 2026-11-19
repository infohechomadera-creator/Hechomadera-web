import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { obtenerPrecios } from "@/lib/precios/fuente";
import { dentroDelLimite, ipDe } from "@/lib/limite";
import { LIMITES_CHARLA, turnosDelCliente, validarHistorial, validarMensaje } from "@/lib/agente/guardia";
import { leerEstado } from "@/lib/agente/herramientas";
import { MENSAJE_SIN_SERVICIO, agenteActivo, clienteAnthropic, conversar } from "@/lib/agente/conversar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Mensajes por IP y hora. */
const LIMITE_POR_IP_HORA = 40;
/** Mensajes de todo el sitio por día (tope de gasto propio, además del tope mensual de Anthropic). */
const LIMITE_GLOBAL_DIA = 600;

const sinCache = { "Cache-Control": "no-store" };
const responder = (estado: number, cuerpo: object) => NextResponse.json(cuerpo, { status: estado, headers: sinCache });

/**
 * POST /api/configurador/agente (público). JSON:
 *   historial  la conversación que guarda el navegador (lo que esta API devolvió antes)
 *   mensaje    lo nuevo que escribió el cliente
 *   estado     lo que tiene el configurador (ciudad, forma, diseño, color, herrajes, electrodomésticos, medidas_m, tiene_contacto)
 * Devuelve el texto del agente, las entradas nuevas del historial, el estado para el configurador
 * y, si se calculó, el rango (lo calcula el servidor, nunca la IA). No guarda nada ni crea el lead.
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
  const historial = validarHistorial(datos.historial);
  if (!historial.ok) return responder(400, { error: historial.error, reiniciar: true });
  if (turnosDelCliente(historial.valor) >= LIMITES_CHARLA.turnos) {
    return responder(429, { error: "Llegamos al máximo de mensajes de esta conversación. Sigue con el formulario o empieza de nuevo.", reiniciar: true });
  }

  const ip = ipDe(request);
  if (!(await dentroDelLimite(`agente-ip:${ip}`, LIMITE_POR_IP_HORA, 3600))) {
    return responder(429, { error: "Muchos mensajes seguidos. Espera un rato o sigue con el formulario." });
  }
  if (!(await dentroDelLimite("agente-global:dia", LIMITE_GLOBAL_DIA, 86_400))) {
    return responder(503, { error: MENSAJE_SIN_SERVICIO });
  }

  const { tablas } = await obtenerPrecios();
  const estado = leerEstado(datos.estado, tablas);

  try {
    const r = await conversar({ cliente: clienteAnthropic(), historial: historial.valor, mensaje: mensaje.valor, estado, tablas });
    return responder(200, { ok: true, texto: r.texto, historial: r.nuevos, estado: r.estado, rango: r.rango, contacto: r.contacto });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) {
      // Historial que la API no acepta (por ejemplo, alterado): se empieza de nuevo. También llega aquí si se acabó el saldo.
      return responder(400, { error: "No pude seguir esta conversación. Empecemos de nuevo o sigue con el formulario.", reiniciar: true });
    }
    if (e instanceof Anthropic.RateLimitError) return responder(503, { error: "El asistente está ocupado. Intenta en un momento o sigue con el formulario." });
    console.error("[agente] fallo de la API de Anthropic", e instanceof Anthropic.APIError ? e.status : "sin estado");
    return responder(503, { error: MENSAJE_SIN_SERVICIO });
  }
}
