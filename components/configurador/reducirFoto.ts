/**
 * Reduce una foto en el navegador antes de enviarla: lado mayor 1600 px, JPEG.
 * Una foto de celular (3–6 MB) queda en ~300–600 KB. Devuelve null si no se pudo leer.
 */
const LADO_MAX = 1600;
const CALIDADES = [0.82, 0.7, 0.55];
const MAX_BYTES = 1_400_000;

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
  const escala = Math.min(1, LADO_MAX / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  for (const calidad of CALIDADES) {
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  return null;
}
