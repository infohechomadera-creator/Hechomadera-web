/**
 * Herramientas del agente de IA (W6). El agente solo puede llenar el configurador:
 * cada valor se valida aquí con las mismas reglas del formulario, y el rango lo
 * calcula `calcularRango` en el servidor. Al agente NUNCA se le devuelven cifras de dinero.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { ErrorPrecio, LIMITES_MM, calcularRango } from "@/lib/precios/calcular";
import { ELECTRODOMESTICOS, validarConfiguracion, validarContacto, type Contacto, type Electrodomestico } from "@/lib/configurador/validar";
import {
  CIUDADES_ACTIVAS,
  DISENOS,
  FORMAS,
  NIVELES_HERRAJES,
  type CiudadActiva,
  type DisenoBase,
  type Forma,
  type MedidasAprox,
  type NivelHerrajes,
} from "@/lib/precios/tipos";
import { todosLosColores, type Tablas } from "./catalogo";

type CampoMedida = keyof MedidasAprox;
const CAMPOS_MEDIDA: CampoMedida[] = ["pared_a", "pared_b", "pared_c", "isla"];

export const PAREDES_DE: Record<Forma, CampoMedida[]> = {
  lineal: ["pared_a"],
  L: ["pared_a", "pared_b"],
  U: ["pared_a", "pared_b", "pared_c"],
  isla: ["pared_a", "isla"],
};

/** Lo que el configurador tiene lleno. Medidas en metros. Sin datos de contacto (no van a la IA). */
export interface EstadoAgente {
  ciudad: CiudadActiva;
  forma: Forma | null;
  diseno: DisenoBase | null;
  color: string | null;
  herrajes: NivelHerrajes | null;
  electrodomesticos: Electrodomestico[];
  medidas_m: Partial<Record<CampoMedida, number>>;
  /** Solo si ya hay nombre y celular en el formulario (sin mostrarlos a la IA). */
  tiene_contacto: boolean;
}

export interface RangoPantalla {
  min: number;
  max: number;
  ciudad: string;
}

const esTexto = (v: unknown): v is string => typeof v === "string";
const incluye = <T extends string>(lista: readonly T[], v: unknown): v is T => esTexto(v) && lista.includes(v as T);

/** Lee el estado que manda el navegador sin confiar en él: lo que no sea válido queda vacío. */
export function leerEstado(datos: unknown, tablas: Tablas): EstadoAgente {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const ciudad = incluye(CIUDADES_ACTIVAS, d.ciudad) ? d.ciudad : CIUDADES_ACTIVAS[0];
  const medidasEntrada = (d.medidas_m && typeof d.medidas_m === "object" ? d.medidas_m : {}) as Record<string, unknown>;
  const medidas_m: EstadoAgente["medidas_m"] = {};
  for (const campo of CAMPOS_MEDIDA) {
    const v = medidasEntrada[campo];
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100) medidas_m[campo] = v;
  }
  const electro = Array.isArray(d.electrodomesticos) ? d.electrodomesticos : [];
  return {
    ciudad,
    forma: incluye(FORMAS, d.forma) ? d.forma : null,
    diseno: incluye(DISENOS, d.diseno) ? d.diseno : null,
    color: esTexto(d.color) && Object.hasOwn(tablas[ciudad].colores, d.color) ? d.color : null,
    herrajes: incluye(NIVELES_HERRAJES, d.herrajes) ? d.herrajes : null,
    electrodomesticos: [
      ...new Set(electro.filter((e): e is Electrodomestico => esTexto(e) && Object.hasOwn(ELECTRODOMESTICOS, e))),
    ],
    medidas_m,
    tiene_contacto: d.tiene_contacto === true,
  };
}

/** Lo que todavía falta para calcular el rango y para enviar. */
export function faltantes(e: EstadoAgente): string[] {
  const f: string[] = [];
  if (!e.forma) f.push("forma");
  if (!e.diseno) f.push("diseno");
  if (!e.color) f.push("color");
  if (!e.herrajes) f.push("herrajes");
  if (e.forma) {
    for (const p of PAREDES_DE[e.forma]) if (e.medidas_m[p] === undefined) f.push(p);
  } else f.push("medidas");
  if (!e.tiene_contacto) f.push("contacto");
  return f;
}

/** Texto del estado para la IA (lo pone la web, no el cliente). */
export function textoEstado(e: EstadoAgente): string {
  const { tiene_contacto, ...resto } = e;
  return `<estado_configurador>${JSON.stringify({ ...resto, contacto: tiene_contacto ? "lleno" : "vacío", faltan: faltantes(e) })}</estado_configurador>`;
}

/** Definición de las 3 herramientas. Determinista para que las instrucciones se puedan guardar en caché. */
export function definirHerramientas(tablas: Tablas): Anthropic.Tool[] {
  const metros = { type: "number", description: "Metros (por ejemplo 3.2)" };
  return [
    {
      name: "actualizar_configuracion",
      description:
        "Llena o cambia campos del configurador de cocina con lo que el cliente decidió. Manda solo los campos que cambian. Devuelve qué se aplicó, los errores y lo que falta.",
      input_schema: {
        type: "object",
        properties: {
          ciudad: { type: "string", enum: [...CIUDADES_ACTIVAS] },
          forma: { type: "string", enum: [...FORMAS] },
          diseno: { type: "string", enum: [...DISENOS] },
          color: { type: "string", enum: todosLosColores(tablas), description: "Debe existir en la ciudad elegida" },
          herrajes: { type: "string", enum: [...NIVELES_HERRAJES] },
          electrodomesticos: {
            type: "array",
            items: { type: "string", enum: Object.keys(ELECTRODOMESTICOS) },
            description: "Lista completa de electrodomésticos (reemplaza la anterior)",
          },
          medidas_m: {
            type: "object",
            properties: { pared_a: metros, pared_b: metros, pared_c: metros, isla: metros },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "calcular_rango",
      description:
        "Calcula el rango de precio con la configuración actual y lo muestra al cliente en pantalla. Úsala cuando ya estén forma, diseño, color, herrajes y medidas. No devuelve cifras: tú nunca das precios.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "guardar_contacto",
      description:
        "Pone el nombre, el celular y el correo (opcional) del cliente en el formulario. El cliente luego revisa, marca la autorización y envía.",
      input_schema: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          telefono: { type: "string", description: "Celular" },
          email: { type: "string", description: "Opcional" },
        },
        required: ["nombre", "telefono"],
        additionalProperties: false,
      },
    },
  ];
}

export interface ResultadoHerramienta {
  estado: EstadoAgente;
  /** Lo que se le devuelve a la IA (JSON). Nunca lleva montos. */
  texto: string;
  error: boolean;
  /** Si cambió algo que afecta el rango. */
  cambioConfiguracion: boolean;
  rango?: RangoPantalla;
  contacto?: Contacto;
}

/** Configuración en el formato del formulario (medidas en milímetros) para validar y calcular. */
export function aConfiguracion(e: EstadoAgente) {
  const medidas_mm: Record<string, number> = {};
  for (const campo of e.forma ? PAREDES_DE[e.forma] : []) {
    const m = e.medidas_m[campo];
    if (m !== undefined) medidas_mm[campo] = Math.round(m * 1000);
  }
  return {
    ciudad: e.ciudad,
    forma: e.forma,
    diseno: e.diseno,
    color: e.color,
    herrajes: e.herrajes,
    electrodomesticos: e.electrodomesticos,
    medidas_mm,
  };
}

const json = (v: unknown) => JSON.stringify(v);

function actualizar(input: Record<string, unknown>, anterior: EstadoAgente, tablas: Tablas): ResultadoHerramienta {
  const e: EstadoAgente = { ...anterior, medidas_m: { ...anterior.medidas_m }, electrodomesticos: [...anterior.electrodomesticos] };
  const aplicado: string[] = [];
  const errores: string[] = [];

  if (input.ciudad !== undefined) {
    if (incluye(CIUDADES_ACTIVAS, input.ciudad)) {
      e.ciudad = input.ciudad;
      aplicado.push("ciudad");
      if (e.color && !Object.hasOwn(tablas[e.ciudad].colores, e.color)) {
        e.color = null;
        errores.push("El color elegido no existe en esa ciudad; pide otro");
      }
    } else errores.push("ciudad: solo Barranquilla o Santa Marta");
  }
  if (input.forma !== undefined) {
    if (incluye(FORMAS, input.forma)) (e.forma = input.forma), aplicado.push("forma");
    else errores.push("forma no válida");
  }
  if (input.diseno !== undefined) {
    if (incluye(DISENOS, input.diseno)) (e.diseno = input.diseno), aplicado.push("diseno");
    else errores.push("diseno no válido");
  }
  if (input.color !== undefined) {
    if (esTexto(input.color) && Object.hasOwn(tablas[e.ciudad].colores, input.color)) (e.color = input.color), aplicado.push("color");
    else errores.push(`color no existe en ${e.ciudad}`);
  }
  if (input.herrajes !== undefined) {
    if (incluye(NIVELES_HERRAJES, input.herrajes)) (e.herrajes = input.herrajes), aplicado.push("herrajes");
    else errores.push("herrajes no válidos");
  }
  if (input.electrodomesticos !== undefined) {
    const lista = input.electrodomesticos;
    if (Array.isArray(lista) && lista.every((x) => esTexto(x) && Object.hasOwn(ELECTRODOMESTICOS, x))) {
      e.electrodomesticos = [...new Set(lista as Electrodomestico[])];
      aplicado.push("electrodomesticos");
    } else errores.push("electrodomésticos no válidos");
  }
  if (input.medidas_m !== undefined) {
    const m = (input.medidas_m && typeof input.medidas_m === "object" ? input.medidas_m : {}) as Record<string, unknown>;
    for (const [campo, valor] of Object.entries(m)) {
      if (!CAMPOS_MEDIDA.includes(campo as CampoMedida)) {
        errores.push(`medida desconocida: ${campo}`);
        continue;
      }
      const limite = campo === "isla" ? LIMITES_MM.isla : LIMITES_MM.pared;
      const mm = typeof valor === "number" && Number.isFinite(valor) ? Math.round(valor * 1000) : NaN;
      if (!(mm >= limite.min && mm <= limite.max)) {
        errores.push(`${campo}: debe estar entre ${limite.min / 1000} y ${limite.max / 1000} metros`);
        continue;
      }
      e.medidas_m[campo as CampoMedida] = mm / 1000;
      aplicado.push(campo);
    }
  }

  return {
    estado: e,
    texto: json({ aplicado, errores, faltan: faltantes(e) }),
    error: aplicado.length === 0 && errores.length > 0,
    cambioConfiguracion: aplicado.length > 0,
  };
}

function rango(e: EstadoAgente, tablas: Tablas): ResultadoHerramienta {
  const fallo = (mensaje: string) => ({ estado: e, texto: json({ ok: false, error: mensaje, faltan: faltantes(e) }), error: true, cambioConfiguracion: false });
  const config = validarConfiguracion(aConfiguracion(e), tablas);
  if (!config.ok) return fallo(`${config.campo}: ${config.error}`);
  try {
    const r = calcularRango(tablas[config.valor.ciudad], config.valor);
    return {
      estado: e,
      // Sin cifras a propósito: el agente no puede repetir ni cambiar el rango.
      texto: json({ ok: true, mensaje: "Rango calculado y mostrado al cliente en pantalla. No escribas cifras de dinero." }),
      error: false,
      cambioConfiguracion: false,
      rango: { min: r.min, max: r.max, ciudad: r.ciudad },
    };
  } catch (err) {
    if (err instanceof ErrorPrecio) return fallo(`${err.campo}: ${err.message}`);
    return fallo("No se pudo calcular el rango");
  }
}

function contacto(input: Record<string, unknown>, e: EstadoAgente): ResultadoHerramienta {
  const r = validarContacto(input);
  if (!r.ok) return { estado: e, texto: json({ ok: false, campo: r.campo, error: r.error }), error: true, cambioConfiguracion: false };
  return {
    estado: { ...e, tiene_contacto: true },
    texto: json({ ok: true, mensaje: "Datos puestos en el formulario. El cliente debe revisarlos, marcar la autorización y pulsar Enviar." }),
    error: false,
    cambioConfiguracion: false,
    contacto: r.valor,
  };
}

export function ejecutarHerramienta(nombre: string, input: unknown, estado: EstadoAgente, tablas: Tablas): ResultadoHerramienta {
  const datos = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (nombre === "actualizar_configuracion") return actualizar(datos, estado, tablas);
  if (nombre === "calcular_rango") return rango(estado, tablas);
  if (nombre === "guardar_contacto") return contacto(datos, estado);
  return { estado, texto: json({ ok: false, error: "Herramienta desconocida" }), error: true, cambioConfiguracion: false };
}
