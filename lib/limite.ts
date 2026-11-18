/**
 * Límite de solicitudes con Upstash Redis (ventana fija). Lo usan las API públicas
 * (configurador) y la de Operflow. Si Redis no está configurado o falla, no bloquea.
 */
import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;
function clienteRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

/** true si todavía hay cupo en la ventana actual (`ventanaSeg` segundos). */
export async function dentroDelLimite(nombre: string, limite: number, ventanaSeg = 60): Promise<boolean> {
  const r = clienteRedis();
  if (!r) return true;
  try {
    const ventana = Math.floor(Date.now() / (ventanaSeg * 1000));
    const clave = `hm:limite:${nombre}:${ventanaSeg}:${ventana}`;
    const n = await r.incr(clave);
    if (n === 1) await r.expire(clave, ventanaSeg * 2);
    return n <= limite;
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
