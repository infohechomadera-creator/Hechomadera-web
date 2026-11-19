/**
 * Límite de solicitudes (ventana fija) con un contador en Supabase (`contar_intento`). Lo usan las API
 * públicas (configurador, enlaces de pago, aviso de Mercado Pago) y las de Operflow.
 * Antes usaba Upstash Redis; Upstash borró esa base por falta de uso y se decidió no usar Redis (2026-11-19).
 * La clave se guarda como huella SHA-256: en la base no queda la IP.
 * Si Supabase no está configurado o falla, no bloquea (sin Supabase la web tampoco puede guardar nada).
 */
import { createHash } from "node:crypto";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { clienteSistema } from "@/lib/supabase/servidor";

/** true si todavía hay cupo en la ventana actual (`ventanaSeg` segundos). */
export async function dentroDelLimite(nombre: string, limite: number, ventanaSeg = 60): Promise<boolean> {
  if (!supabaseConfigurado() || !process.env.SUPABASE_SECRET_KEY) return true;
  try {
    const clave = createHash("sha256").update(`hm:limite:${nombre}:${ventanaSeg}`).digest("hex");
    const { data, error } = await clienteSistema().rpc("contar_intento", {
      p_clave: clave,
      p_ventana_seg: ventanaSeg,
      p_limite: limite,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/**
 * IP de quien llama (Vercel la pone primera en x-forwarded-for). Las IPv6 se agrupan por
 * su prefijo /64, porque una misma conexión puede cambiar libremente los últimos 64 bits.
 */
export function ipDe(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().toLowerCase();
  if (!ip) return "desconocida";
  if (!ip.includes(":")) return ip.slice(0, 64);
  const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4 escrita como IPv6
  if (v4) return v4[1];
  const [cabeza, cola = ""] = ip.split("::");
  const izq = cabeza ? cabeza.split(":") : [];
  const der = cola ? cola.split(":") : [];
  const bloques = ip.includes("::") ? [...izq, ...Array(Math.max(0, 8 - izq.length - der.length)).fill("0"), ...der] : izq;
  return `${bloques.slice(0, 4).map((b) => b.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
