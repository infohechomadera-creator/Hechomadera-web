import { describe, expect, it } from "vitest";
import { esEstadoAMano, pasoElFiltro, validarNota, validarProximoContacto } from "@/lib/leads";

const HOY = "2026-11-18";

describe("reglas del CRM", () => {
  it("solo nuevo, contactado y perdido se eligen a mano", () => {
    expect(["nuevo", "contactado", "perdido"].every(esEstadoAMano)).toBe(true);
    for (const e of ["diseno_pagado", "aprobado", "no_aprobo", "propuesta_enviada", "", null]) {
      expect(esEstadoAMano(e)).toBe(false);
    }
  });

  it("la nota se limpia y tiene límites", () => {
    expect(validarNota("  Llamé, no contestó  ")).toBe("Llamé, no contestó");
    expect(validarNota("   ")).toBeNull();
    expect(validarNota(123)).toBeNull();
    expect(validarNota("a".repeat(2000))).toHaveLength(2000);
    expect(validarNota("a".repeat(2001))).toBeNull();
  });

  it("el próximo contacto va de hoy a un año, o vacío para quitarlo", () => {
    expect(validarProximoContacto("", HOY)).toEqual({ ok: true, fecha: null });
    expect(validarProximoContacto(null, HOY)).toEqual({ ok: true, fecha: null });
    expect(validarProximoContacto(HOY, HOY)).toEqual({ ok: true, fecha: HOY });
    expect(validarProximoContacto("2027-11-18", HOY)).toEqual({ ok: true, fecha: "2027-11-18" });
    for (const malo of ["2026-11-17", "2027-11-19", "2026-02-30", "18/11/2026", "2026-11-18T00:00", 20261118]) {
      expect(validarProximoContacto(malo, HOY).ok).toBe(false);
    }
  });

  it("pasa el filtro quien ya pagó algo", () => {
    expect(pasoElFiltro("nada")).toBe(false);
    expect(pasoElFiltro(null)).toBe(false);
    expect(pasoElFiltro("diseno")).toBe(true);
    expect(pasoElFiltro("anticipo")).toBe(true);
  });
});
