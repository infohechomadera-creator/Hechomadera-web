import { describe, expect, it } from "vitest";
import { elegirTablas, opcionMasEconomica } from "@/lib/precios/fuente";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";

describe("fuente de precios", () => {
  it("usa la versión de Supabase cuando es válida", () => {
    const baq = { ...PRECIOS_EJEMPLO.Barranquilla, metro_lineal: { ...PRECIOS_EJEMPLO.Barranquilla.metro_lineal, D1: 2_500_000 } };
    const r = elegirTablas([{ ciudad: "Barranquilla", datos: baq }]);
    expect(r.origen.Barranquilla).toBe("supabase");
    expect(r.tablas.Barranquilla.metro_lineal.D1).toBe(2_500_000);
  });

  it("si falta una ciudad, esa ciudad usa la semilla", () => {
    const r = elegirTablas([{ ciudad: "Barranquilla", datos: PRECIOS_EJEMPLO.Barranquilla }]);
    expect(r.origen["Santa Marta"]).toBe("semilla");
    expect(r.tablas["Santa Marta"]).toEqual(PRECIOS_EJEMPLO["Santa Marta"]);
  });

  it("si una versión está mal formada, no rompe la página: usa la semilla", () => {
    const r = elegirTablas([{ ciudad: "Santa Marta", datos: { moneda: "USD" } }]);
    expect(r.origen["Santa Marta"]).toBe("semilla");
  });

  it("el 'desde' usa la opción más económica aunque gerencia renombre las claves", () => {
    expect(opcionMasEconomica({ laca: { nombre: "Laca", recargo_pct: 15 }, lisa: { nombre: "Lisa", recargo_pct: 0 } })).toBe("lisa");
  });
});
