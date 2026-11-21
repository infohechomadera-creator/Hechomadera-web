import { describe, expect, it } from "vitest";
import { MAX_BYTES_FOTO, tipoReal, validarFotos } from "@/lib/configurador/fotos";

const jpeg = (n = 100) => new Uint8Array([0xff, 0xd8, 0xff, ...new Array(n).fill(1)]);
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = () => new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
const archivo = (b: Uint8Array, nombre = "foto.jpg", tipo = "image/jpeg") => new File([b as BlobPart], nombre, { type: tipo });

describe("fotos del espacio", () => {
  it("reconoce JPEG, PNG y WEBP por su contenido", () => {
    expect(tipoReal(jpeg())).toBe("image/jpeg");
    expect(tipoReal(png())).toBe("image/png");
    expect(tipoReal(webp())).toBe("image/webp");
  });

  it("rechaza un archivo que dice ser .jpg pero no lo es", async () => {
    const falso = archivo(new TextEncoder().encode("<script>alert(1)</script>"), "foto.jpg", "image/jpeg");
    expect((await validarFotos([falso])).ok).toBe(false);
  });

  it("acepta hasta 5 y rechaza la sexta", async () => {
    expect((await validarFotos(Array.from({ length: 5 }, () => archivo(jpeg())))).ok).toBe(true);
    expect((await validarFotos(Array.from({ length: 6 }, () => archivo(jpeg())))).ok).toBe(false);
  });

  it("rechaza fotos muy pesadas, vacías o que suman demasiado", async () => {
    expect((await validarFotos([archivo(jpeg(MAX_BYTES_FOTO))])).ok).toBe(false);
    expect((await validarFotos([archivo(new Uint8Array())])).ok).toBe(false);
    const grande = () => archivo(jpeg(MAX_BYTES_FOTO - 100));
    expect((await validarFotos([grande(), grande(), grande()])).ok).toBe(false);
  });

  it("sin fotos también vale (son opcionales)", async () => {
    expect(await validarFotos([])).toEqual({ ok: true, fotos: [] });
  });
});
