/**
 * Cobro de un lead por su enlace secreto (`leads.pago_token`). Solo servidor (llave secreta).
 * Devuelve lo mínimo para mostrar al cliente: producto, ciudad y el siguiente cobro. Nada personal.
 */
import { clienteSistema } from "@/lib/supabase/servidor";
import { obtenerPrecios } from "@/lib/precios/fuente";
import { CIUDADES_ACTIVAS, type CiudadActiva, type Producto } from "@/lib/precios/tipos";
import { siguienteCobro, sumarPagado, type SiguienteCobro, type TipoCobro } from "./calcular";
import { buscarOrdenAbierta, borrarOrdenSinPago, crearOrdenId, guardarOrdenNueva, ponerPreferencia } from "./ordenes";
import { crearPreferencia } from "./preferencia";

export const TOKEN = /^[0-9a-f]{64}$/;

const NOMBRE_PRODUCTO: Record<string, string> = {
  cocina: "cocina",
  closet: "closet",
  mueble_bano: "mueble de baño",
  centro_entretenimiento: "centro de entretenimiento",
  puerta: "puerta",
  escritorio: "escritorio",
};
export const nombreProducto = (p: string) => NOMBRE_PRODUCTO[p] ?? p;

const TITULO: Record<TipoCobro, string> = { diseno: "Diseño de", anticipo: "Anticipo de", saldo: "Saldo de" };
export const tituloCobro = (tipo: TipoCobro, producto: string) => `${TITULO[tipo]} ${nombreProducto(producto)} — Hechomadera`;

export type CobroLead = { leadId: string; producto: Producto; ciudad: string; cobro: SiguienteCobro };

type Fila = {
  id: string;
  producto: Producto;
  ciudad: string;
  pago_estado: "nada" | "diseno" | "anticipo" | "saldo";
  estado: string;
  valor_final: number | null;
  valor_final_medido: number | null;
  operflow_estado: string | null;
  clientes: { datos_borrados_at: string | null } | null;
  pagos: { tipo: string; monto: number; cuenta: boolean }[];
};

export async function leerCobroLead(token: string): Promise<CobroLead | null> {
  if (!TOKEN.test(token)) return null;
  const { data } = await clienteSistema()
    .from("leads")
    .select("id, producto, ciudad, pago_estado, estado, valor_final, valor_final_medido, operflow_estado, clientes(datos_borrados_at), pagos(tipo, monto, cuenta)")
    .eq("pago_token", token)
    .maybeSingle<Fila>();
  if (!data || !CIUDADES_ACTIVAS.includes(data.ciudad as CiudadActiva)) return null;
  const { tablas } = await obtenerPrecios();
  const cobro = siguienteCobro(
    {
      producto: data.producto,
      pago_estado: data.pago_estado,
      estado: data.estado,
      valor_final: data.valor_final == null ? null : Number(data.valor_final),
      valor_final_medido: data.valor_final_medido == null ? null : Number(data.valor_final_medido),
      operflow_estado: data.operflow_estado,
      datos_borrados: Boolean(data.clientes?.datos_borrados_at),
    },
    tablas[data.ciudad as CiudadActiva],
    sumarPagado(data.pagos ?? []),
  );
  return { leadId: data.id, producto: data.producto, ciudad: data.ciudad, cobro };
}

export type ResultadoCobro = { ok: true; url: string } | { ok: false; status: number; error: string };

/** Crea (o reusa) la orden del siguiente cobro y devuelve el enlace de Mercado Pago. */
export async function iniciarCobroLead(token: string): Promise<ResultadoCobro> {
  const info = await leerCobroLead(token);
  if (!info) return { ok: false, status: 404, error: "Este enlace de pago no existe." };
  if (!info.cobro.ok) return { ok: false, status: 409, error: "No hay un pago pendiente en este enlace." };
  const { tipo, monto } = info.cobro;

  const abierta = await buscarOrdenAbierta(info.leadId, tipo, monto);
  if (abierta) return { ok: true, url: abierta.url };

  const id = crearOrdenId();
  const items = [{ title: tituloCobro(tipo, info.producto), quantity: 1, unit_price: monto, currency_id: "COP" as const }];
  if (!(await guardarOrdenNueva({ id, tipo, lead_id: info.leadId, referencia: null, items }))) {
    return { ok: false, status: 500, error: "No pudimos preparar el pago. Intenta de nuevo." };
  }
  const pref = await crearPreferencia({ ordenId: id, items });
  if (!pref.ok) {
    await borrarOrdenSinPago(id);
    return { ok: false, status: pref.status, error: pref.error };
  }
  await ponerPreferencia(id, pref.preferenciaId, pref.url);
  return { ok: true, url: pref.url };
}
