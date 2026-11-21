/**
 * Validación de lo que manda el configurador (W3). Funciones puras: el servidor
 * nunca confía en el navegador. El rango lo calcula `calcularRango` con la tabla de la ciudad.
 */
import {
  CIUDADES_ACTIVAS,
  DISENOS,
  FORMAS,
  NIVELES_HERRAJES,
  type CiudadActiva,
  type EntradaRango,
  type MedidasAprox,
  type TablaPrecios,
} from "@/lib/precios/tipos";
import { AUTORIZACION_VERSION } from "./autorizacion";

/** Electrodomésticos que el cliente puede marcar. Solo informan: no cambian el precio. */
export const ELECTRODOMESTICOS = {
  estufa: "Estufa o cubierta",
  horno: "Horno",
  campana: "Campana",
  nevera: "Nevera",
  lavaplatos: "Lavaplatos",
  microondas: "Microondas",
  otro: "Otro",
} as const;
export type Electrodomestico = keyof typeof ELECTRODOMESTICOS;

export interface Configuracion extends EntradaRango {
  ciudad: CiudadActiva;
  electrodomesticos: Electrodomestico[];
}

export interface Contacto {
  nombre: string;
  telefono: string;
  email: string | null;
}

export interface SolicitudLead {
  configuracion: Configuracion;
  contacto: Contacto;
  envio_id: string;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; campo: string; error: string };

const mal = (campo: string, error: string) => ({ ok: false as const, campo, error });
const esTexto = (v: unknown): v is string => typeof v === "string";
const incluye = <T extends string>(lista: readonly T[], v: unknown): v is T => esTexto(v) && lista.includes(v as T);

const PAREDES: Record<EntradaRango["forma"], (keyof MedidasAprox)[]> = {
  lineal: ["pared_a"],
  L: ["pared_a", "pared_b"],
  U: ["pared_a", "pared_b", "pared_c"],
  isla: ["pared_a", "isla"],
};

/** Forma, diseño, color, herrajes, electrodomésticos y medidas (solo las que usa la forma). */
export function validarConfiguracion(
  datos: unknown,
  tablas: Record<CiudadActiva, TablaPrecios>,
): Resultado<Configuracion> {
  if (!datos || typeof datos !== "object") return mal("datos", "Faltan los datos de la cocina");
  const d = datos as Record<string, unknown>;
  if (!incluye(CIUDADES_ACTIVAS, d.ciudad)) return mal("ciudad", "Elige Barranquilla o Santa Marta");
  if (!incluye(FORMAS, d.forma)) return mal("forma", "Elige la forma de tu cocina");
  if (!incluye(DISENOS, d.diseno)) return mal("diseno", "Elige un diseño base");
  const tabla = tablas[d.ciudad];
  if (!esTexto(d.color) || !Object.hasOwn(tabla.colores, d.color)) return mal("color", "Elige un color");
  if (!incluye(NIVELES_HERRAJES, d.herrajes)) return mal("herrajes", "Elige el nivel de herrajes");

  const electro = d.electrodomesticos ?? [];
  if (!Array.isArray(electro) || electro.length > Object.keys(ELECTRODOMESTICOS).length) {
    return mal("electrodomesticos", "Electrodomésticos no válidos");
  }
  if (!electro.every((e) => esTexto(e) && Object.hasOwn(ELECTRODOMESTICOS, e))) {
    return mal("electrodomesticos", "Electrodomésticos no válidos");
  }

  const entrada = (d.medidas_mm ?? {}) as Record<string, unknown>;
  const medidas: MedidasAprox = { pared_a: 0 };
  for (const campo of PAREDES[d.forma]) {
    const v = entrada[campo];
    if (typeof v !== "number" || !Number.isInteger(v)) return mal(campo, "Escribe esta medida en metros");
    medidas[campo] = v;
  }

  return {
    ok: true,
    valor: {
      ciudad: d.ciudad,
      forma: d.forma,
      diseno: d.diseno,
      color: d.color,
      herrajes: d.herrajes,
      electrodomesticos: [...new Set(electro as Electrodomestico[])],
      medidas_mm: medidas,
    },
  };
}

const TELEFONO = /^\+?[0-9 ]{7,20}$/; // la misma regla de la base (clientes.telefono)
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

export function validarContacto(datos: unknown): Resultado<Contacto> {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  for (const campo of ["nombre", "telefono", "email"] as const) {
    if (esTexto(d[campo]) && CONTROL.test(d[campo] as string)) return mal(campo, "Hay caracteres no válidos");
  }
  const nombre = esTexto(d.nombre) ? d.nombre.trim().replace(/\s+/g, " ") : "";
  if (nombre.length < 2 || nombre.length > 120) return mal("nombre", "Escribe tu nombre");
  const telefono = esTexto(d.telefono) ? d.telefono.replace(/[\s().-]/g, "") : "";
  if (!TELEFONO.test(telefono) || telefono.replace(/\D/g, "").length < 7) {
    return mal("telefono", "Escribe un celular válido");
  }
  const correo = esTexto(d.email) ? d.email.trim().toLowerCase() : "";
  if (correo && (correo.length > 200 || !CORREO.test(correo))) return mal("email", "El correo no es válido");
  return { ok: true, valor: { nombre, telefono, email: correo || null } };
}

/** Todo lo del envío final: configuración, contacto, autorización vigente y envio_id. */
export function validarSolicitud(datos: unknown, tablas: Record<CiudadActiva, TablaPrecios>): Resultado<SolicitudLead> {
  if (!datos || typeof datos !== "object") return mal("datos", "Faltan datos");
  const d = datos as Record<string, unknown>;
  const autorizacion = (d.autorizacion ?? {}) as Record<string, unknown>;
  if (autorizacion.acepta !== true) return mal("autorizacion", "Debes autorizar el tratamiento de tus datos para enviar");
  if (autorizacion.version !== AUTORIZACION_VERSION) {
    return mal("autorizacion", "El texto de autorización cambió; recarga la página");
  }
  if (!esTexto(d.envio_id) || !UUID.test(d.envio_id)) return mal("envio_id", "Envío no válido; recarga la página");
  const configuracion = validarConfiguracion(d.configuracion, tablas);
  if (!configuracion.ok) return configuracion;
  const contacto = validarContacto(d.contacto);
  if (!contacto.ok) return contacto;
  return { ok: true, valor: { configuracion: configuracion.valor, contacto: contacto.valor, envio_id: d.envio_id } };
}
