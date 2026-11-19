/**
 * Ciclo de conversación del agente de IA (W6) con la API de Mensajes de Anthropic.
 * El servidor ejecuta las herramientas; la IA nunca ve precios y su texto pasa por `quitarPrecios`.
 * No se guarda nada: la conversación vive en el navegador del cliente.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Contacto } from "@/lib/configurador/validar";
import type { Tablas } from "./catalogo";
import { quitarPrecios } from "./guardia";
import { definirHerramientas, ejecutarHerramienta, textoEstado, type EstadoAgente, type RangoPantalla } from "./herramientas";
import { instrucciones } from "./prompt";

export const MODELO = "claude-haiku-5-5";
const MAX_VUELTAS = 5;
const MAX_TOKENS = 2048;

export const MENSAJE_SIN_SERVICIO = "El asistente no está disponible en este momento. Puedes seguir con el formulario paso a paso.";
const MENSAJE_SIGAMOS = "Listo, ya actualicé el formulario. ¿Seguimos?";

/** Lo mínimo del SDK que usa el ciclo (las pruebas pasan uno simulado). */
export interface ClienteMensajes {
  messages: { create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> };
}

export interface Respuesta {
  /** Texto para el cliente (ya sin precios). */
  texto: string;
  /** Entradas nuevas del historial (el navegador las agrega a las que ya tiene). */
  nuevos: Anthropic.MessageParam[];
  estado: EstadoAgente;
  /** Rango calculado por el servidor en este turno, válido para `estado`. */
  rango: RangoPantalla | null;
  contacto: Contacto | null;
  rechazo: boolean;
}

/** Solo texto y llamadas a herramientas, sin precios en el texto (así queda también en el historial). */
function limpiarRespuesta(contenido: Anthropic.ContentBlock[]): (Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam)[] {
  const bloques: (Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam)[] = [];
  for (const b of contenido) {
    if (b.type === "text" && b.text.trim()) bloques.push({ type: "text", text: quitarPrecios(b.text).slice(0, 4000) });
    else if (b.type === "tool_use") bloques.push({ type: "tool_use", id: b.id, name: b.name, input: b.input as Record<string, unknown> });
  }
  return bloques;
}

export async function conversar(opciones: {
  cliente: ClienteMensajes;
  historial: Anthropic.MessageParam[];
  mensaje: string;
  estado: EstadoAgente;
  tablas: Tablas;
}): Promise<Respuesta> {
  const { cliente, historial, mensaje, tablas } = opciones;
  let estado = opciones.estado;
  let rango: RangoPantalla | null = null;
  let contacto: Contacto | null = null;

  const nuevos: Anthropic.MessageParam[] = [
    { role: "user", content: [{ type: "text", text: textoEstado(estado) }, { type: "text", text: mensaje }] },
  ];
  const sistema: Anthropic.TextBlockParam[] = [{ type: "text", text: instrucciones(tablas), cache_control: { type: "ephemeral" } }];
  const herramientas = definirHerramientas(tablas);
  let texto = "";

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const r = await cliente.messages.create({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system: sistema,
      tools: herramientas,
      // Conversación corta para llenar un formulario: sin razonamiento extendido y esfuerzo bajo (más barato y rápido).
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      messages: [...historial, ...nuevos],
    });

    if (r.stop_reason === "refusal") {
      // Se descarta el turno para que la conversación pueda seguir.
      return { texto: MENSAJE_SIN_SERVICIO, nuevos: [], estado: opciones.estado, rango: null, contacto: null, rechazo: true };
    }

    const bloques = limpiarRespuesta(r.content);
    if (!bloques.length) bloques.push({ type: "text", text: MENSAJE_SIGAMOS });
    nuevos.push({ role: "assistant", content: bloques });
    texto = bloques
      .filter((b): b is Anthropic.TextBlockParam => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const llamadas = bloques.filter((b): b is Anthropic.ToolUseBlockParam => b.type === "tool_use");
    if (!llamadas.length) break;

    // Todos los resultados van juntos en un solo mensaje.
    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const llamada of llamadas) {
      const res = ejecutarHerramienta(llamada.name, llamada.input, estado, tablas);
      estado = res.estado;
      if (res.cambioConfiguracion) rango = null; // un rango viejo ya no vale
      if (res.rango) rango = res.rango;
      if (res.contacto) contacto = res.contacto;
      resultados.push({ type: "tool_result", tool_use_id: llamada.id, content: res.texto, ...(res.error ? { is_error: true } : {}) });
    }
    nuevos.push({ role: "user", content: resultados });
    texto = "";
  }

  return { texto: texto || MENSAJE_SIGAMOS, nuevos, estado, rango, contacto, rechazo: false };
}

/** El agente funciona solo con la llave de Anthropic y el interruptor encendido. */
export function agenteActivo(): boolean {
  return process.env.AGENTE_IA_ACTIVO === "true" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export function clienteAnthropic(): ClienteMensajes {
  // Lee ANTHROPIC_API_KEY del entorno. Pocos reintentos y tiempo corto: el cliente espera en el celular.
  return new Anthropic({ maxRetries: 1, timeout: 25_000 });
}
