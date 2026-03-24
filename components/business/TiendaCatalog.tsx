"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPriceCOP, CATEGORY_LABELS, type StoreProduct, type ProductCategory } from "@/lib/products";

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
    <Link href={`/tienda/${product.slug}`} className="group block">
      {/* image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* info */}
      <div className="mt-3">
        {categoryLabel && (
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {categoryLabel}
          </p>
        )}
        <p className="mt-1 text-sm font-semibold text-ink group-hover:underline group-hover:underline-offset-2">
          {product.name}
        </p>
        {product.material && (
          <p className="mt-0.5 text-xs text-ink-muted">{product.material}</p>
        )}
        <p className="mt-2 text-sm font-medium text-ink">
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
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
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
    <div className="space-y-8">
      {/* categories */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink">Categoría</p>
        <ul className="mt-3 space-y-2">
          {categories.map((cat) => (
            <li key={cat}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={activeCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="h-4 w-4 border-neutral-300 accent-ink"
                />
                <span className="text-sm text-ink">{CATEGORY_LABELS[cat]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* price */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink">Precio</p>
        <ul className="mt-3 space-y-2">
          {PRICE_RANGES.map((range, i) => (
            <li key={range.label}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="price-range"
                  checked={activePriceIdx === i}
                  onChange={() =>
                    setActivePriceIdx(activePriceIdx === i ? null : i)
                  }
                  className="h-4 w-4 border-neutral-300 accent-ink"
                />
                <span className="text-sm text-ink">{range.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs text-ink-muted underline hover:text-ink"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* ── mobile filter toggle ── */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {filtersOpen ? "Ocultar filtros" : "Filtrar"}
          {hasFilters && (
            <span className="flex h-4 w-4 items-center justify-center bg-ink text-xs font-bold text-paper">
              {activeCategories.length + (activePriceIdx !== null ? 1 : 0)}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-mobile" className="sr-only">Ordenar por</label>
          <select
            id="sort-mobile"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="border border-neutral-300 bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* mobile filter panel */}
      {filtersOpen && (
        <div className="border-b border-neutral-200 py-6 lg:hidden">
          <FilterPanel />
        </div>
      )}

      <div className="mt-6 flex gap-10">
        {/* ── desktop sidebar ── */}
        <aside className="hidden w-52 shrink-0 lg:block">
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
              <label htmlFor="sort-desktop" className="text-xs text-ink-muted">Ordenar:</label>
              <select
                id="sort-desktop"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="border border-neutral-300 bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-ink-muted">
                Sin productos para los filtros seleccionados.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm text-ink underline"
              >
                Ver todos
              </button>
            </div>
          ) : (
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
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
