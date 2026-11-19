/**
 * Guardas del agente de IA (W6):
 *  - `tienePrecio` / `quitarPrecios`: si el texto de la IA menciona dinero, no llega al cliente.
 *  - `validarHistorial`: la conversación la guarda el navegador y no se confía en ella.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";

export const MENSAJE_SIN_PRECIOS =
  "No te puedo dar precios por aquí: el rango lo calcula la web con la tabla vigente y lo ves en pantalla. ¿Seguimos con tu cocina?";

const NUMERO_EN_LETRAS =
  "(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|cien|doscientos|trescientos|quinientos)";
const NO_LETRA = "(?![a-záéíóúñü])";

/** Patrones de dinero (con la bandera g para poder taparlos). Incluye jerga: palos, lucas, k, M. */
const PATRONES_DINERO: RegExp[] = [
  /\$\s*\d[\d.,]*/g, // $ 12.000.000, $12
  /\b(?:cop|usd|us\$)\s*\d[\d.,]*/gi, // COP 5.000.000
  new RegExp(`\\d[\\d.,\\s]*\\s*(?:millones|mill[oó]n|mil${NO_LETRA}|pesos|cop${NO_LETRA}|usd${NO_LETRA}|d[oó]lares|palos?${NO_LETRA}|lucas?${NO_LETRA}|barras?${NO_LETRA}|k${NO_LETRA})`, "gi"), // 12 millones, 800 mil, 500 lucas, 800k
  /\d[\d.,]*\s?M\b/g, // 12 M, 12M (la "m" minúscula son metros)
  new RegExp(`\\b${NUMERO_EN_LETRAS}\\s+(?:millones|mill[oó]n|palos?|lucas?|barras?)${NO_LETRA}(?!\\s+de\\s+(?!pesos))`, "gi"), // doce palos, un millón (no "un palo de escoba")
  /\bmill[oó]n(?:es)?\b/gi,
  /\b\d{1,3}(?:[.,\s]\d{3}){2,}\b/g, // 12.000.000 (un millón o más con separadores)
  /\b\d{7,}\b/g, // 12000000
  /\b(?:pesos|d[oó]lares)\b/gi,
];

/** Un celular colombiano (3XX XXX XXXX) no es un precio. */
const CELULAR = /(?:\+?57[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/** true si el texto parece mencionar una cifra de dinero. */
export function tienePrecio(texto: string): boolean {
  const sinCelulares = texto.replace(CELULAR, " ");
  return PATRONES_DINERO.some((p) => {
    p.lastIndex = 0;
    return p.test(sinCelulares);
  });
}

/**
 * Tapa las cifras de dinero que escribe el cliente antes de mandarlas a la IA, para que no pueda
 * repetirlas ni hacer cuentas con ellas ("me salió 12 millones, ¿y con isla?"). Los celulares se respetan.
 */
export function taparCifras(texto: string): string {
  const celulares: string[] = [];
  let t = texto.replace(CELULAR, (c) => `\u0000${celulares.push(c) - 1}\u0000`);
  for (const p of PATRONES_DINERO) t = t.replace(p, "[cifra]");
  // eslint-disable-next-line no-control-regex
  return t.replace(/\u0000(\d+)\u0000/g, (_, i: string) => celulares[Number(i)]);
}

/** Devuelve el texto tal cual, o el mensaje fijo si menciona dinero. */
export function quitarPrecios(texto: string): string {
  return tienePrecio(texto) ? MENSAJE_SIN_PRECIOS : texto;
}

export const LIMITES_CHARLA = {
  /** Caracteres por mensaje del cliente. */
  mensaje: 1000,
  /** Mensajes del cliente por conversación. */
  turnos: 30,
  /** Entradas del historial (cliente, IA y resultados de herramientas). */
  entradas: 200,
  /** Tamaño total del historial en caracteres. */
  caracteres: 30_000,
} as const;

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const ID_HERRAMIENTA = /^[a-zA-Z0-9_-]{1,100}$/;
const NOMBRES = new Set(["actualizar_configuracion", "calcular_rango", "guardar_contacto"]);

/** Mensaje nuevo del cliente: texto, sin caracteres raros, hasta 1.000 caracteres. */
export function validarMensaje(datos: unknown): Resultado<string> {
  if (typeof datos !== "string") return { ok: false, error: "Escribe un mensaje" };
  const texto = datos.trim();
  if (!texto) return { ok: false, error: "Escribe un mensaje" };
  if (texto.length > LIMITES_CHARLA.mensaje) return { ok: false, error: "El mensaje es muy largo" };
  if (CONTROL.test(texto)) return { ok: false, error: "Hay caracteres no válidos" };
  return { ok: true, valor: texto };
}

const textoCorto = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max && !CONTROL.test(v);

/**
 * Reconstruye el historial que manda el navegador con solo lo permitido:
 * roles cliente/IA (nunca "system"), bloques de texto, llamadas a nuestras herramientas y sus resultados.
 * Cualquier otra cosa invalida el historial (el navegador lo reinicia).
 */
export function validarHistorial(datos: unknown): Resultado<Anthropic.MessageParam[]> {
  const mal = { ok: false as const, error: "La conversación no es válida; empieza de nuevo" };
  if (datos === undefined || datos === null) return { ok: true, valor: [] };
  if (!Array.isArray(datos) || datos.length > LIMITES_CHARLA.entradas) return mal;
  if (JSON.stringify(datos).length > LIMITES_CHARLA.caracteres) return mal;

  const salida: Anthropic.MessageParam[] = [];
  for (const m of datos) {
    if (!m || typeof m !== "object" || !Array.isArray((m as { content?: unknown }).content)) return mal;
    const { role, content } = m as { role: unknown; content: unknown[] };
    if (role === "user") {
      const bloques: (Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam)[] = [];
      for (const b of content as Record<string, unknown>[]) {
        if (b?.type === "text" && textoCorto(b.text, 4000)) bloques.push({ type: "text", text: b.text });
        else if (b?.type === "tool_result" && textoCorto(b.tool_use_id, 100) && ID_HERRAMIENTA.test(b.tool_use_id) && textoCorto(b.content, 4000)) {
          bloques.push({ type: "tool_result", tool_use_id: b.tool_use_id, content: b.content, ...(b.is_error === true ? { is_error: true } : {}) });
        } else return mal;
      }
      if (!bloques.length) return mal;
      salida.push({ role: "user", content: bloques });
    } else if (role === "assistant") {
      const bloques: (Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam)[] = [];
      for (const b of content as Record<string, unknown>[]) {
        if (b?.type === "text" && textoCorto(b.text, 4000)) bloques.push({ type: "text", text: b.text });
        else if (
          b?.type === "tool_use" &&
          textoCorto(b.id, 100) &&
          ID_HERRAMIENTA.test(b.id) &&
          typeof b.name === "string" &&
          NOMBRES.has(b.name) &&
          b.input !== null &&
          typeof b.input === "object" &&
          !Array.isArray(b.input)
        ) {
          bloques.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
        } else return mal;
      }
      if (!bloques.length) return mal;
      salida.push({ role: "assistant", content: bloques });
    } else return mal;
  }
  if (salida.length && salida[0].role !== "user") return mal;
  return { ok: true, valor: salida };
}

/** Mensajes escritos por el cliente: los del cliente empiezan con texto; los de resultados de herramientas, no. */
export function turnosDelCliente(historial: Anthropic.MessageParam[]): number {
  return historial.filter((m) => m.role === "user" && Array.isArray(m.content) && m.content[0]?.type === "text").length;
}

/**
 * Firma del historial (HMAC-SHA256). El navegador guarda la conversación, pero solo se acepta la que
 * firmó el servidor: así no se puede inventar historial ni saltarse el máximo de mensajes.
 * La clave se deriva de la llave de Anthropic (no hace falta otra variable); si la llave cambia,
 * las conversaciones abiertas empiezan de nuevo.
 */
export function firmarHistorial(historial: unknown[], secreto = process.env.ANTHROPIC_API_KEY ?? ""): string {
  const clave = createHash("sha256").update(`hm:agente:historial:${secreto}`).digest();
  return createHmac("sha256", clave).update(JSON.stringify(historial)).digest("hex");
}

export function firmaValida(historial: unknown[], firma: unknown, secreto = process.env.ANTHROPIC_API_KEY ?? ""): boolean {
  if (!historial.length) return true;
  if (typeof firma !== "string" || !/^[0-9a-f]{64}$/.test(firma) || !secreto) return false;
  return timingSafeEqual(Buffer.from(firmarHistorial(historial, secreto), "hex"), Buffer.from(firma, "hex"));
}
