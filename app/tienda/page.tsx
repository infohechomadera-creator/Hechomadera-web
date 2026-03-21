import type { Metadata } from "next";
import Link from "next/link";
import products from "@/content/products.json";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Productos estándar con precio en COP. Pago 100% online. Envío no incluido por defecto.",
};

export default function TiendaPage() {
  const list = products as { id: string; name: string; priceCOP: number; slug: string }[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Tienda</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Productos marketplace: precio fijo en pesos colombianos. {siteConfig.business.marketplaceShippingNote} Integración de pago
        (Mercado Pago) se conecta en fase manual con credenciales de producción/prueba.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 ? (
          <li className="col-span-full text-sm text-ink-muted">
            Aún no hay productos en JSON. Añade entradas en <code className="rounded bg-neutral-100 px-1">content/products.json</code> o
            importa desde el catálogo actual.
          </li>
        ) : (
          list.map((p) => (
            <li key={p.id} className="border border-neutral-200 bg-white p-6">
              <Link href={`/tienda/${p.slug}`} className="font-medium text-ink hover:underline">
                {p.name}
              </Link>
              <p className="mt-2 text-sm text-ink-muted">
                {p.priceCOP.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
