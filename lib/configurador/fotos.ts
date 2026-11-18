/**
 * Fotos del espacio (W3). Se revisa el contenido real del archivo (sus primeros bytes),
 * no el nombre ni el tipo que dice el navegador. El navegador las reduce antes de enviarlas.
 */
export const MAX_FOTOS = 5;
export const MAX_BYTES_FOTO = 1_500_000;
/** Vercel acepta hasta 4,5 MB por envío; se deja margen para el resto del formulario. */
export const MAX_BYTES_TOTAL = 4_000_000;

export type TipoFoto = "image/jpeg" | "image/png" | "image/webp";
export const EXTENSION: Record<TipoFoto, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function tipoReal(b: Uint8Array): TipoFoto | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  const ascii = (desde: number, hasta: number) => String.fromCharCode(...b.slice(desde, hasta));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export interface FotoValida {
  bytes: Uint8Array;
  tipo: TipoFoto;
}

export async function validarFotos(
  archivos: File[],
): Promise<{ ok: true; fotos: FotoValida[] } | { ok: false; error: string }> {
  if (archivos.length > MAX_FOTOS) return { ok: false, error: `Puedes enviar hasta ${MAX_FOTOS} fotos` };
  let total = 0;
  const fotos: FotoValida[] = [];
  for (const archivo of archivos) {
    if (archivo.size === 0) return { ok: false, error: "Una de las fotos está vacía" };
    if (archivo.size > MAX_BYTES_FOTO) return { ok: false, error: "Una de las fotos pesa demasiado" };
    total += archivo.size;
    if (total > MAX_BYTES_TOTAL) return { ok: false, error: "Las fotos pesan demasiado en total; envía menos" };
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const tipo = tipoReal(bytes);
    if (!tipo) return { ok: false, error: "Solo se aceptan fotos JPG, PNG o WEBP" };
    fotos.push({ bytes, tipo });
  }
  return { ok: true, fotos };
}
