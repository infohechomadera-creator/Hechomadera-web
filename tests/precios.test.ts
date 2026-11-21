import { describe, expect, it } from "vitest";
import {
  ErrorPrecio,
  calcularAnticipo,
  calcularDevolucionTrasMedicion,
  calcularRango,
  calcularSaldo,
  metrosPorForma,
} from "@/lib/precios/calcular";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { validarTablaPrecios } from "@/lib/precios/validar";
import type { TablaPrecios } from "@/lib/precios/tipos";

const baq = PRECIOS_EJEMPLO.Barranquilla;

describe("metros por forma", () => {
  it("lineal usa solo la pared A", () => {
    expect(metrosPorForma("lineal", { pared_a: 3000, pared_b: 9999 })).toEqual({ lineales: 3, isla: 0 });
  });
  it("L suma A y B; U suma A, B y C", () => {
    expect(metrosPorForma("L", { pared_a: 3200, pared_b: 2400 }).lineales).toBeCloseTo(5.6);
    expect(metrosPorForma("U", { pared_a: 3000, pared_b: 2400, pared_c: 2400 }).lineales).toBeCloseTo(7.8);
  });
  it("isla usa pared A más el largo de la isla", () => {
    expect(metrosPorForma("isla", { pared_a: 3000, isla: 1800 })).toEqual({ lineales: 3, isla: 1.8 });
  });
  it("rechaza medidas faltantes o fuera de rango", () => {
    expect(() => metrosPorForma("L", { pared_a: 3000 })).toThrow(ErrorPrecio);
    expect(() => metrosPorForma("lineal", { pared_a: 100 })).toThrow(/entre 0.6 y 12 metros/);
    expect(() => metrosPorForma("lineal", { pared_a: Number.NaN })).toThrow(/Falta/);
    expect(() => metrosPorForma("isla", { pared_a: 3000 })).toThrow(/isla/);
    expect(() => metrosPorForma("isla", { pared_a: 3000, isla: 8000 })).toThrow(/isla/);
  });
});

describe("rango de precio", () => {
  it("cocina lineal de 3 m, diseño D1, blanco, estándar en Barranquilla", () => {
    const r = calcularRango(baq, {
      forma: "lineal",
      diseno: "D1",
      color: "blanco",
      herrajes: "estandar",
      medidas_mm: { pared_a: 3000 },
    });
    // 3 × 1.900.000 = 5.700.000 ± 12% → 5.016.000 / 6.384.000 → redondeo 50.000 hacia afuera
    expect(r).toMatchObject({ estimado: 5_700_000, min: 5_000_000, max: 6_400_000, moneda: "COP" });
  });

  it("aplica recargos de color y herrajes multiplicados", () => {
    const r = calcularRango(baq, {
      forma: "lineal",
      diseno: "D1",
      color: "madera",
      herrajes: "premium",
      medidas_mm: { pared_a: 3000 },
    });
    expect(r.estimado).toBe(Math.round(5_700_000 * 1.08 * 1.1));
  });

  it("suma la isla a su propio precio por metro", () => {
    const r = calcularRango(baq, {
      forma: "isla",
      diseno: "D2",
      color: "blanco",
      herrajes: "estandar",
      medidas_mm: { pared_a: 3000, isla: 2000 },
    });
    expect(r.estimado).toBe(3 * 2_100_000 + 2 * 2_400_000);
  });

  it("el rango siempre contiene el estimado y está redondeado", () => {
    for (const forma of ["lineal", "L", "U", "isla"] as const) {
      const r = calcularRango(baq, {
        forma,
        diseno: "D5",
        color: "color",
        herrajes: "alta",
        medidas_mm: { pared_a: 3333, pared_b: 2777, pared_c: 2111, isla: 1555 },
      });
      expect(r.min).toBeLessThan(r.estimado);
      expect(r.max).toBeGreaterThan(r.estimado);
      expect(r.min % baq.redondeo).toBe(0);
      expect(r.max % baq.redondeo).toBe(0);
    }
  });

  it("los precios dependen de la ciudad", () => {
    const entrada = {
      forma: "L",
      diseno: "D3",
      color: "blanco",
      herrajes: "estandar",
      medidas_mm: { pared_a: 3000, pared_b: 2000 },
    } as const;
    const a = calcularRango(baq, entrada);
    const b = calcularRango(PRECIOS_EJEMPLO["Santa Marta"], entrada);
    expect(a.ciudad).toBe("Barranquilla");
    expect(b.ciudad).toBe("Santa Marta");
    expect(a.estimado).not.toBe(b.estimado);
  });

  it("rechaza opciones que no existen en la tabla", () => {
    const base = { forma: "lineal", medidas_mm: { pared_a: 3000 } } as const;
    expect(() => calcularRango(baq, { ...base, diseno: "D9" as never, color: "blanco", herrajes: "estandar" })).toThrow(
      /Diseño/,
    );
    expect(() => calcularRango(baq, { ...base, diseno: "D1", color: "oro", herrajes: "estandar" })).toThrow(/Color/);
    expect(() => calcularRango(baq, { ...base, diseno: "D1", color: "blanco", herrajes: "x" as never })).toThrow(
      /herrajes/,
    );
  });
});

describe("pagos", () => {
  it("anticipo = 35% del valor final menos el diseño", () => {
    expect(calcularAnticipo(20_000_000, 300_000, 35)).toBe(6_700_000);
  });
  it("el anticipo nunca es negativo", () => {
    expect(calcularAnticipo(500_000, 300_000, 35)).toBe(0);
  });
  it("saldo = valor recalculado menos todo lo pagado", () => {
    // diseño 300.000 + anticipo 6.700.000 = 7.000.000 pagado; valor sube a 21.000.000 tras medir
    expect(calcularSaldo(21_000_000, 7_000_000)).toBe(14_000_000);
    expect(calcularSaldo(5_000_000, 7_000_000)).toBe(0);
  });
  it("devolución tras medición = anticipo menos la visita; el diseño no entra", () => {
    expect(calcularDevolucionTrasMedicion(6_700_000, 150_000)).toBe(6_550_000);
    expect(calcularDevolucionTrasMedicion(100_000, 150_000)).toBe(0);
  });
  it("rechaza montos negativos o con decimales", () => {
    expect(() => calcularAnticipo(-1, 0, 35)).toThrow(ErrorPrecio);
    expect(() => calcularSaldo(10.5, 0)).toThrow(ErrorPrecio);
  });
});

describe("validar tabla de precios", () => {
  it("las tablas de ejemplo son válidas", () => {
    expect(validarTablaPrecios(PRECIOS_EJEMPLO.Barranquilla)).toEqual([]);
    expect(validarTablaPrecios(PRECIOS_EJEMPLO["Santa Marta"])).toEqual([]);
  });
  it("detecta datos faltantes o mal formados", () => {
    const mala = {
      ...baq,
      moneda: "USD",
      metro_lineal: { ...baq.metro_lineal, D3: 0 },
      incertidumbre_pct: 80,
    } as unknown as TablaPrecios;
    const problemas = validarTablaPrecios(mala);
    expect(problemas).toContain("La moneda debe ser COP");
    expect(problemas).toContain("Falta el precio por metro del diseño D3");
    expect(problemas).toContain("La incertidumbre debe estar entre 0 y 50%");
  });
  it("rechaza algo que no es una tabla", () => {
    expect(validarTablaPrecios(null)).toEqual(["La tabla de precios está vacía"]);
  });
});
