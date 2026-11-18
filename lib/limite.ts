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

/** IP de quien llama (Vercel la pone primera en x-forwarded-for). */
export function ipDe(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? ip.slice(0, 64) : "desconocida";
}
