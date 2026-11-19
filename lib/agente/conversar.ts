/**
 * Ciclo de conversación del agente de IA (W6) con la API de Mensajes de Anthropic.
 * El servidor ejecuta las herramientas; la IA nunca ve precios y su texto pasa por `quitarPrecios`.
 * No se guarda nada: la conversación vive en el navegador del cliente (firmada por el servidor).
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Contacto } from "@/lib/configurador/validar";
import type { Tablas } from "./catalogo";
import { quitarPrecios, taparCifras } from "./guardia";
import { definirHerramientas, ejecutarHerramienta, textoEstado, type EstadoAgente, type RangoPantalla } from "./herramientas";
import { instrucciones } from "./prompt";

export const MODELO = "claude-haiku-5-5";
const MAX_VUELTAS = 5;
const MAX_TOKENS = 2048;
/** Tiempo total para responder (Vercel corta la función a los 60 s). */
const TIEMPO_TOTAL_MS = 50_000;
const TIEMPO_POR_LLAMADA_MS = 25_000;
/** Con menos de esto no se empieza otra vuelta. */
const TIEMPO_MINIMO_MS = 8_000;
const MAX_RESULTADO = 4000;

export const MENSAJE_SIN_SERVICIO = "El asistente no está disponible en este momento. Puedes seguir con el formulario paso a paso.";
const MENSAJE_SIGAMOS = "Listo, ya actualicé el formulario. ¿Seguimos?";

/** Lo mínimo del SDK que usa el ciclo (las pruebas pasan uno simulado). */
export interface ClienteMensajes {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming, opciones?: { timeout?: number }): Promise<Anthropic.Message>;
  };
}

/** No hay cupo para llamar a la IA (tope diario de llamadas o no se pudo contar). */
export class SinCupo extends Error {
  constructor() {
    super("Sin cupo para el agente");
    this.name = "SinCupo";
  }
}

export interface Respuesta {
  /** Texto para el cliente (ya sin precios). */
  texto: string;
  /** Entradas nuevas del historial. */
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

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Quita del historial nuevo el nombre, el celular y el correo una vez puestos en el formulario,
 * para que no se vuelvan a mandar a la IA en cada mensaje.
 */
function ocultarContacto(nuevos: Anthropic.MessageParam[], c: Contacto): Anthropic.MessageParam[] {
  const palabras = [c.nombre, ...c.nombre.split(" "), c.email ?? ""].filter((p) => p.length >= 3).sort((a, b) => b.length - a.length);
  // Solo palabras completas ("Ana" no toca "ventana").
  const nombre = palabras.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${palabras.map(escaparRegex).join("|")})(?![\\p{L}\\p{N}])`, "giu") : null;
  const tapar = (t: string) => {
    let s = t.replace(/\+?\d(?:[\s().-]?\d){6,}/g, "[celular guardado]");
    if (nombre) s = s.replace(nombre, "[dato guardado]");
    return s;
  };
  return nuevos.map((m, i) => {
    if (!Array.isArray(m.content)) return m;
    const content = m.content.map((b, j) => {
      if (b.type === "text" && !(i === 0 && j === 0)) return { ...b, text: tapar(b.text) };
      if (b.type === "tool_use" && b.name === "guardar_contacto") return { ...b, input: { nombre: "[guardado]", telefono: "[guardado]" } };
      return b;
    });
    return { ...m, content } as Anthropic.MessageParam;
  });
}

export async function conversar(opciones: {
  cliente: ClienteMensajes;
  historial: Anthropic.MessageParam[];
  mensaje: string;
  estado: EstadoAgente;
  tablas: Tablas;
  /** Se pregunta antes de cada llamada a la IA (tope diario de llamadas). */
  permitirLlamada?: () => Promise<boolean>;
  tiempoTotalMs?: number;
}): Promise<Respuesta> {
  const { cliente, historial, mensaje, tablas, permitirLlamada = async () => true } = opciones;
  const fin = Date.now() + (opciones.tiempoTotalMs ?? TIEMPO_TOTAL_MS);
  let estado = opciones.estado;
  let rango: RangoPantalla | null = null;
  let contacto: Contacto | null = null;

  // Las cifras de dinero que escriba el cliente se tapan: la IA no puede repetirlas ni hacer cuentas.
  let nuevos: Anthropic.MessageParam[] = [
    { role: "user", content: [{ type: "text", text: textoEstado(estado) }, { type: "text", text: taparCifras(mensaje) }] },
  ];
  const sistema: Anthropic.TextBlockParam[] = [{ type: "text", text: instrucciones(tablas), cache_control: { type: "ephemeral" } }];
  const herramientas = definirHerramientas(tablas);
  let texto = "";

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const restante = fin - Date.now();
    if (vuelta > 0 && restante < TIEMPO_MINIMO_MS) break;
    if (!(await permitirLlamada())) {
      if (vuelta === 0) throw new SinCupo();
      break;
    }

    const r = await cliente.messages.create(
      {
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: sistema,
        tools: herramientas,
        // Conversación corta para llenar un formulario: sin razonamiento extendido y esfuerzo bajo (más barato y rápido).
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        // Caché automática del historial: cada mensaje nuevo reutiliza lo ya enviado.
        cache_control: { type: "ephemeral" },
        messages: [...historial, ...nuevos],
      },
      { timeout: Math.max(1000, Math.min(TIEMPO_POR_LLAMADA_MS, restante)) },
    );

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
      resultados.push({
        type: "tool_result",
        tool_use_id: llamada.id,
        content: res.texto.slice(0, MAX_RESULTADO),
        ...(res.error ? { is_error: true } : {}),
      });
    }
    nuevos.push({ role: "user", content: resultados });
    texto = "";
  }

  if (contacto) nuevos = ocultarContacto(nuevos, contacto);
  return { texto: texto || MENSAJE_SIGAMOS, nuevos, estado, rango, contacto, rechazo: false };
}

/** El agente funciona solo con la llave de Anthropic y el interruptor encendido. */
export function agenteActivo(): boolean {
  return process.env.AGENTE_IA_ACTIVO === "true" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export function clienteAnthropic(): ClienteMensajes {
  // Lee ANTHROPIC_API_KEY del entorno. Sin reintentos: el tiempo lo controla el ciclo y el cliente espera en el celular.
  return new Anthropic({ maxRetries: 0, timeout: TIEMPO_POR_LLAMADA_MS });
}
