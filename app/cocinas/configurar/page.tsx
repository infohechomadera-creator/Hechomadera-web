import type { Metadata } from "next";
import { Configurador, type OpcionesCiudad } from "@/components/configurador/Configurador";
import { obtenerPrecios } from "@/lib/precios/fuente";
import { CIUDADES_ACTIVAS } from "@/lib/precios/tipos";

// Las opciones salen de la tabla de precios de Supabase; se regenera cada 5 minutos.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Configura tu cocina — rango de precio en minutos",
  description: "Elige forma, diseño, colores y herrajes, pon tus medidas aproximadas y conoce el rango de precio de tu cocina.",
  // Provisional (W3): no indexar hasta tener renders y precios reales.
  robots: { index: false, follow: false },
};

export default async function ConfigurarPage() {
  const { tablas } = await obtenerPrecios();
  const opciones = {} as OpcionesCiudad;
  for (const ciudad of CIUDADES_ACTIVAS) {
    const t = tablas[ciudad];
    const lista = (o: Record<string, { nombre: string; recargo_pct: number }>) =>
      Object.entries(o)
        .sort((a, b) => a[1].recargo_pct - b[1].recargo_pct)
        .map(([id, v]) => ({ id, nombre: v.nombre }));
    opciones[ciudad] = { colores: lista(t.colores), herrajes: lista(t.herrajes) };
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Configura tu cocina</h1>
      <div className="mt-6">
        <Configurador ciudades={[...CIUDADES_ACTIVAS]} opciones={opciones} />
      </div>
    </div>
  );
}
