import { describe, expect, it } from "vitest";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { validarConfiguracion, validarContacto, validarSolicitud } from "@/lib/configurador/validar";
import { AUTORIZACION_VERSION } from "@/lib/configurador/autorizacion";

const T = PRECIOS_EJEMPLO;
const config = { ciudad: "Barranquilla", forma: "L", diseno: "D3", color: "madera", herrajes: "premium", electrodomesticos: ["horno"], medidas_mm: { pared_a: 3000, pared_b: 2400 } };
const solicitud = {
  configuracion: config,
  contacto: { nombre: "Ana Pérez", telefono: "300 123 4567", email: "Ana@Correo.co" },
  autorizacion: { acepta: true, version: AUTORIZACION_VERSION },
  envio_id: "4b6f9c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
};

describe("validar configuración", () => {
  it("acepta una configuración completa y deja solo las medidas de la forma", () => {
    const r = validarConfiguracion({ ...config, medidas_mm: { pared_a: 3000, pared_b: 2400, pared_c: 9999, isla: 1 } }, T);
    expect(r.ok && r.valor.medidas_mm).toEqual({ pared_a: 3000, pared_b: 2400 });
  });

  for (const [campo, valor] of [
    ["ciudad", "Bogotá"],
    ["forma", "Z"],
    ["diseno", "D9"],
    ["color", "__proto__"],
    ["herrajes", "oro"],
    ["electrodomesticos", ["jacuzzi"]],
  ] as const) {
    it(`rechaza ${campo} no válido`, () => {
      const r = validarConfiguracion({ ...config, [campo]: valor }, T);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.campo).toBe(campo);
    });
  }

  it("pide la medida que falta según la forma", () => {
    const r = validarConfiguracion({ ...config, medidas_mm: { pared_a: 3000 } }, T);
    expect(!r.ok && r.campo).toBe("pared_b");
  });
});

describe("validar contacto", () => {
  it("limpia el teléfono y pone el correo en minúsculas", () => {
    const r = validarContacto(solicitud.contacto);
    expect(r.ok && r.valor).toEqual({ nombre: "Ana Pérez", telefono: "3001234567", email: "ana@correo.co" });
  });
  it("el correo es opcional", () => {
    const r = validarContacto({ nombre: "Ana", telefono: "+57 3001234567" });
    expect(r.ok && r.valor.email).toBeNull();
  });
  for (const [campo, valor] of [["nombre", " "], ["telefono", "123"], ["telefono", "abc1234567"], ["email", "no-es-correo"]] as const) {
    it(`rechaza ${campo}="${valor}"`, () => {
      const r = validarContacto({ ...solicitud.contacto, [campo]: valor });
      expect(!r.ok && r.campo).toBe(campo);
    });
  }
});

describe("validar solicitud completa", () => {
  it("acepta la solicitud", () => expect(validarSolicitud(solicitud, T).ok).toBe(true));
  it("sin autorización no se envía", () => {
    const r = validarSolicitud({ ...solicitud, autorizacion: { acepta: false, version: AUTORIZACION_VERSION } }, T);
    expect(!r.ok && r.campo).toBe("autorizacion");
  });
  it("con una versión vieja del texto no se envía", () => {
    const r = validarSolicitud({ ...solicitud, autorizacion: { acepta: true, version: "v0" } }, T);
    expect(!r.ok && r.campo).toBe("autorizacion");
  });
  it("envio_id debe ser un identificador válido", () => {
    expect(validarSolicitud({ ...solicitud, envio_id: "1; drop table" }, T).ok).toBe(false);
  });
});
