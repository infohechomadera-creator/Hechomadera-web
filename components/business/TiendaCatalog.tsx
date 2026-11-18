"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPriceCOP, CATEGORY_LABELS, type StoreProduct, type ProductCategory } from "@/lib/products";
import { track } from "@/lib/analytics";

/* ─── price buckets ──────────────────────────────────────── */
const PRICE_RANGES = [
  { label: "Hasta $5.000.000", min: 0, max: 5_000_000 },
  { label: "$5M – $10M", min: 5_000_000, max: 10_000_000 },
  { label: "$10M – $20M", min: 10_000_000, max: 20_000_000 },
  { label: "Más de $20M", min: 20_000_000, max: Infinity },
] as const;

type SortKey = "relevance" | "price-asc" | "price-desc" | "name-asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevancia" },
  { key: "price-asc", label: "Precio: menor a mayor" },
  { key: "price-desc", label: "Precio: mayor a menor" },
  { key: "name-asc", label: "Nombre A–Z" },
];

/* ─── product card ───────────────────────────────────────── */
function ProductCard({ product }: { product: StoreProduct }) {
  const imgSrc = product.imageSlug
    ? `https://picsum.photos/seed/${product.imageSlug}/600/700`
    : `https://picsum.photos/seed/${product.id}/600/700`;

  const categoryLabel =
    product.category ? CATEGORY_LABELS[product.category] : null;

  return (
    <Link
      href={`/tienda/${product.slug}`}
      className="tarjeta group flex h-full flex-col overflow-hidden transition-colors hover:border-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-dim sm:aspect-[4/5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      {/* info */}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        {categoryLabel && (
          <p className="eyebrow">
            {categoryLabel}
          </p>
        )}
        <p className="mt-1.5 text-base font-semibold leading-snug text-ink">
          {product.name}
        </p>
        {product.material && (
          <p className="mt-1 text-sm text-ink-muted">{product.material}</p>
        )}
        <p className="mt-auto pt-4 font-display text-subheading font-semibold text-ink">
          {formatPriceCOP(product.priceCOP)}
        </p>
      </div>
    </Link>
  );
}

/* ─── main component ─────────────────────────────────────── */
export function TiendaCatalog({ products }: { products: StoreProduct[] }) {
  const [activeCategories, setActiveCategories] = useState<ProductCategory[]>([]);
  const [activePriceIdx, setActivePriceIdx] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];

  function toggleCategory(cat: ProductCategory) {
    setActiveCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      track("filter_apply", { type: "category", value: cat });
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = [...products];

    if (activeCategories.length > 0) {
      list = list.filter((p) => p.category && activeCategories.includes(p.category));
    }

    if (activePriceIdx !== null) {
      const range = PRICE_RANGES[activePriceIdx];
      list = list.filter((p) => p.priceCOP >= range.min && p.priceCOP < range.max);
    }

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.priceCOP - b.priceCOP);
        break;
      case "price-desc":
        list.sort((a, b) => b.priceCOP - a.priceCOP);
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name, "es"));
        break;
    }

    return list;
  }, [products, activeCategories, activePriceIdx, sort]);

  const hasFilters = activeCategories.length > 0 || activePriceIdx !== null;

  function clearFilters() {
    setActiveCategories([]);
    setActivePriceIdx(null);
  }

  /* ── sidebar content (shared desktop/mobile) ── */
  const FilterPanel = () => (
    <div className="space-y-7">
      {/* categories */}
      <div>
        <p className="eyebrow">Categoría</p>
        <ul className="mt-3 space-y-1">
          {categories.map((cat) => (
            <li key={cat}>
              <label className="-mx-2 flex cursor-pointer items-center gap-2.5 rounded-button px-2 py-2 transition-colors hover:bg-paper">
                <input
                  type="checkbox"
                  checked={activeCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="h-4 w-4 rounded accent-ink"
                />
                <span className="text-sm text-graphite">{CATEGORY_LABELS[cat]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* price */}
      <div>
        <p className="eyebrow">Precio</p>
        <ul className="mt-3 space-y-1">
          {PRICE_RANGES.map((range, i) => (
            <li key={range.label}>
              <label className="-mx-2 flex cursor-pointer items-center gap-2.5 rounded-button px-2 py-2 transition-colors hover:bg-paper">
                <input
                  type="radio"
                  name="price-range"
                  checked={activePriceIdx === i}
                  onChange={() =>
                    setActivePriceIdx(activePriceIdx === i ? null : i)
                  }
                  className="h-4 w-4 accent-ink"
                />
                <span className="text-sm text-graphite">{range.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="boton-borde w-full py-2.5"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* ── mobile filter toggle ── */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="boton-neutro boton-pill shrink-0 border border-cloud py-2.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {filtersOpen ? "Ocultar filtros" : "Filtrar"}
          {hasFilters && (
            <span className="etiqueta-ember h-5 min-w-5 justify-center rounded-full px-1.5 py-0 leading-none">
              {activeCategories.length + (activePriceIdx !== null ? 1 : 0)}
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-end">
          <label htmlFor="sort-mobile" className="sr-only">Ordenar por</label>
          <select
            id="sort-mobile"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="campo w-full max-w-[14rem] cursor-pointer py-2.5 pl-4 pr-3"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* mobile filter panel */}
      {filtersOpen && (
        <div className="tarjeta mt-4 p-6 lg:hidden">
          <FilterPanel />
        </div>
      )}

      <div className="mt-6 flex gap-8 lg:mt-0">
        {/* ── desktop sidebar ── */}
        <aside className="tarjeta hidden w-60 shrink-0 self-start p-6 lg:sticky lg:top-24 lg:block">
          <FilterPanel />
        </aside>

        {/* ── main grid ── */}
        <div className="min-w-0 flex-1">
          {/* sort + count bar */}
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "producto" : "productos"}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-desktop" className="text-sm text-ink-soft">Ordenar:</label>
              <select
                id="sort-desktop"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="campo w-auto cursor-pointer py-2.5 pl-4 pr-3"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="tarjeta-suave px-6 py-16 text-center">
              <p className="text-body text-ink-muted">
                Sin productos para los filtros seleccionados.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="boton-primario mt-5"
              >
                Ver todos
              </button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-3">
              {filtered.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
