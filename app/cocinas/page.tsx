import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { CatalogoCocinas, type DesdePorCiudad } from "@/components/cocinas/CatalogoCocinas";
import { ESCENAS } from "@/content/cocinas";
import { calcularRango } from "@/lib/precios/calcular";
import { PRECIOS_EJEMPLO } from "@/lib/precios/semilla";
import { CIUDADES_ACTIVAS } from "@/lib/precios/tipos";

export const metadata: Metadata = {
  title: "Cocinas integrales a medida — formas, diseños y precio desde",
  description:
    "Elige la forma y el diseño de tu cocina integral y conoce un precio de referencia en Barranquilla y Santa Marta.",
  // Provisional (W2): no indexar hasta tener renders y precios reales.
  robots: { index: false, follow: false },
};

/** "Desde" = mínimo del rango para una cocina de referencia, blanco y herrajes estándar. */
function calcularDesde(): DesdePorCiudad {
  const resultado = {} as DesdePorCiudad;
  for (const ciudad of CIUDADES_ACTIVAS) {
    resultado[ciudad] = {};
    for (const e of ESCENAS) {
      resultado[ciudad][e.id] = calcularRango(PRECIOS_EJEMPLO[ciudad], {
        forma: e.forma.id,
        diseno: e.diseno.id,
        color: "blanco",
        herrajes: "estandar",
        medidas_mm: e.forma.referencia_mm,
      }).min;
    }
  }
  return resultado;
}

export default function CocinasPage() {
  const valorDiseno = PRECIOS_EJEMPLO.Barranquilla.valor_diseno.cocina;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Cocinas a medida</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Elige una forma y un diseño base. Te mostramos un precio de referencia para tu ciudad; con tus medidas
          calculamos un rango y, al pagar el diseño, recibes tu propuesta en máximo 48 horas.
        </p>
      </div>

      <section className="mt-10">
        <CatalogoCocinas desde={calcularDesde()} ciudades={[...CIUDADES_ACTIVAS]} />
      </section>

      <section className="mt-16 grid gap-6 border-t border-neutral-200 pt-10 md:grid-cols-3">
        {[
          ["1. Configura", "Forma, diseño, colores, herrajes y medidas aproximadas. Ves tu rango de precio al instante."],
          [
            "2. Paga el diseño",
            `${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valorDiseno)}, que se descuenta de tu cocina. Propuesta en máximo 48 horas.`,
          ],
          ["3. Aprueba y producimos", "Con el anticipo del 35% (menos el diseño) empezamos a fabricar e instalamos."],
        ].map(([t, d]) => (
          <div key={t}>
            <h2 className="font-display text-lg font-semibold text-ink">{t}</h2>
            <p className="mt-2 text-sm text-ink-muted">{d}</p>
          </div>
        ))}
      </section>

      <div className="mt-10">
        <Button href="/contacto">Quiero mi cocina</Button>
      </div>
    </div>
  );
}
