/**
 * Firma de los avisos de Operflow a la web (mensaje B). Formato PROPUESTO por la web (por
 * confirmar en el contrato del lado de Operflow):
 *   encabezado  X-Operflow-Firma: t=<segundos unix>,v1=<hex de HMAC-SHA256>
 *   firmado     `${t}.${cuerpo exacto}` con el secreto OPERFLOW_WEBHOOK_SECRET
 * Se rechaza si falta, si no cuadra o si tiene más de 5 minutos (evita reenvíos viejos).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const ENCABEZADO_FIRMA = "x-operflow-firma";
export const VENTANA_SEG = 300;

export function firmarOperflow(cuerpo: string, secreto: string, t: number): string {
  const v1 = createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

export function firmaOperflowValida(
  encabezado: string | null,
  cuerpo: string,
  secreto: string | undefined,
  ahoraSeg = Math.floor(Date.now() / 1000),
): { ok: true } | { ok: false; motivo: string } {
  if (!secreto) return { ok: false, motivo: "sin_secreto" };
  const partes = Object.fromEntries(
    (encabezado ?? "").split(",").map((p) => p.trim().split("=", 2) as [string, string]).filter(([k, v]) => k && v),
  );
  const t = Number(partes.t);
  const v1 = partes.v1 ?? "";
  if (!Number.isInteger(t) || !/^[0-9a-f]{64}$/.test(v1)) return { ok: false, motivo: "formato" };
  if (Math.abs(ahoraSeg - t) > VENTANA_SEG) return { ok: false, motivo: "vencida" };
  const esperada = createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest();
  const recibida = Buffer.from(v1, "hex");
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada) ? { ok: true } : { ok: false, motivo: "no_cuadra" };
}
