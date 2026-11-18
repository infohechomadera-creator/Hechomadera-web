/**
 * Reduce una foto en el navegador antes de enviarla: lado mayor 1600 px (o 1200 si aún pesa), JPEG.
 * Cada foto queda en máximo 750 KB, así 5 fotos caben en el límite del servidor (4 MB).
 * Devuelve null si no se pudo leer.
 */
const LADOS = [1600, 1200];
const CALIDADES = [0.82, 0.7, 0.55];
export const MAX_BYTES_FOTO_NAVEGADOR = 750_000;

export async function reducirFoto(archivo: File): Promise<Blob | null> {
  let imagen: ImageBitmap | HTMLImageElement;
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    // Safari antiguo: se carga como <img>.
    try {
      imagen = await new Promise<HTMLImageElement>((ok, falla) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = falla;
        img.src = URL.createObjectURL(archivo);
      });
    } catch {
      return null;
    }
  }
  for (const lado of LADOS) {
    const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    for (const calidad of CALIDADES) {
      const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
      if (blob && blob.size <= MAX_BYTES_FOTO_NAVEGADOR) {
        liberar(imagen, lienzo);
        return blob;
      }
    }
    lienzo.width = 0;
  }
  liberar(imagen);
  return null;
}

/** Libera memoria (importante en celulares viejos con varias fotos). */
function liberar(imagen: ImageBitmap | HTMLImageElement, lienzo?: HTMLCanvasElement) {
  if ("close" in imagen) imagen.close();
  if (lienzo) lienzo.width = 0;
}
