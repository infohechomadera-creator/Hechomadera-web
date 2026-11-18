import type { Metadata } from "next";
import products from "@/content/products.json";
import { CATEGORY_LABELS, type StoreProduct, type ProductCategory } from "@/lib/products";
import { TiendaCatalog } from "@/components/business/TiendaCatalog";

export const metadata: Metadata = {
  title: "Tienda — Cocinas Integrales, Closets y Muebles de Madera a Medida",
  description:
    "Cocinas integrales, closets modernos, muebles de baño, vestidores y carpintería arquitectónica con precio fijo. Alternativa a Madecentro, Jamar y Homecenter: fabricación a medida con diseño y proceso digital. Pago online seguro.",
};

/* ─── category card images (placeholder seeds) ──────────── */
const CATEGORY_IMAGES: Record<ProductCategory, string> = {
  cocinas: "hm-cat-kitchen",
  closets: "hm-cat-closet",
  banos: "hm-cat-bath",
  "sala-comedor": "hm-cat-living",
  estudios: "hm-cat-study",
};

export default function TiendaPage() {
  const list = products as StoreProduct[];
  const categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];

  return (
    <div className="contenedor py-12 md:py-20">

      {/* ── heading ──────────────────────────────────────────── */}
      <div className="max-w-3xl">
        <h1 className="titulo-display">Tienda</h1>
        <p className="mt-5 max-w-xl text-body text-ink-muted md:text-body-lg">
          Precio fijo en pesos colombianos. Pago 100% online con Mercado Pago — sin intermediarios,
          sin sorpresas.
        </p>
      </div>

      {/* ── category grid ────────────────────────────────────── */}
      <div data-track-section="tienda-categorias" className="mt-12 md:mt-16">
        <p className="eyebrow">
          Explorar por categoría
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {categories.map((cat) => (
            <li key={cat}>
              <a
                href="#catalogo"
                className="group relative block aspect-square overflow-hidden rounded-card border border-cloud bg-paper-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${CATEGORY_IMAGES[cat]}/400/400`}
                  alt={CATEGORY_LABELS[cat]}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <span className="absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center rounded-badge bg-snow px-2.5 py-1 text-[13px] font-medium text-graphite transition-colors group-hover:bg-paper md:bottom-4 md:left-4">
                  {CATEGORY_LABELS[cat]}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* ── catalog ──────────────────────────────────────────── */}
      <section id="catalogo" data-track-section="tienda-catalogo" className="mt-16 scroll-mt-24 md:mt-24">
        <TiendaCatalog products={list} />
      </section>
    </div>
  );
}
