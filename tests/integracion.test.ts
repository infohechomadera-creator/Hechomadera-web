import { describe, expect, it } from "vitest";
import { claveValida, respuestaPrecios } from "@/lib/integracion/operflow";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";

describe("clave entre servidores (Operflow)", () => {
  const esperada = "clave-de-prueba-larga-0123456789";
  it("acepta la clave correcta en Authorization: Bearer", () => {
    expect(claveValida(`Bearer ${esperada}`, esperada)).toBe(true);
  });
  it("rechaza clave incorrecta, vacía, sin Bearer o sin clave configurada", () => {
    expect(claveValida("Bearer otra", esperada)).toBe(false);
    expect(claveValida(null, esperada)).toBe(false);
    expect(claveValida(esperada, esperada)).toBe(false);
    expect(claveValida("Bearer ", esperada)).toBe(false);
    expect(claveValida(`Bearer ${esperada}`, undefined)).toBe(false);
    expect(claveValida(`Bearer ${esperada}`, "")).toBe(false);
  });
});

describe("respuesta del mensaje D", () => {
  it("incluye precios, vigencia y versión, y nada más", () => {
    const r = respuestaPrecios(PRECIOS_EJEMPLO["Santa Marta"], "v-1");
    expect(r).toMatchObject({ ciudad: "Santa Marta", moneda: "COP", version_id: "v-1", vigente_desde: "2026-11-18" });
    expect(Object.keys(r).sort()).toEqual(
      [
        "anticipo_pct",
        "ciudad",
        "colores",
        "herrajes",
        "incertidumbre_pct",
        "isla_metro_lineal",
        "metro_lineal",
        "moneda",
        "valor_diseno",
        "version_id",
        "vigente_desde",
      ].sort(),
    );
  });
});
