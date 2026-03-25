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
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">

      {/* ── heading ──────────────────────────────────────────── */}
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Cocinas Integrales, Closets y Muebles de Madera</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Carpintería arquitectónica a medida: cocinas integrales, closets modernos, vestidores, muebles de baño y ebanistería — precio fijo en pesos colombianos, pago 100% online.
        </p>
      </div>

      {/* ── category grid ────────────────────────────────────── */}
      <div data-track-section="tienda-categorias" className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Explorar por categoría
        </p>
        <ul className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat) => (
            <li key={cat}>
              <a
                href="#catalogo"
                className="group relative block aspect-square overflow-hidden bg-neutral-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${CATEGORY_IMAGES[cat]}/400/400`}
                  alt={CATEGORY_LABELS[cat]}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-ink/40 transition-colors group-hover:bg-ink/55" />
                <span className="absolute inset-x-0 bottom-0 p-3 font-display text-sm font-semibold text-paper">
                  {CATEGORY_LABELS[cat]}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* ── catalog ──────────────────────────────────────────── */}
      <section id="catalogo" data-track-section="tienda-catalogo" className="mt-16 border-t border-neutral-200 pt-10">
        <TiendaCatalog products={list} />
      </section>
    </div>
  );
}
