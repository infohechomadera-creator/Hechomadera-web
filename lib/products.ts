/**
 * Catálogo marketplace — fuente: content/products.json
 * Añade o edita productos ahí (no hardcodear listas largas en componentes).
 */
export type ProductCategory =
  | "cocinas"
  | "closets"
  | "banos"
  | "sala-comedor"
  | "estudios";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  priceCOP: number;
  /** Texto corto para ficha / SEO */
  description?: string;
  /** Categoría para filtros */
  category?: ProductCategory;
  /** Material principal */
  material?: string;
  /** Seed para imagen principal placeholder (picsum) */
  imageSlug?: string;
  /** Seeds adicionales para galería (ángulos extra) */
  gallerySlug?: string[];
  /** Dimensiones orientativas */
  dimensions?: { ancho?: string; alto?: string; profundidad?: string };
  /** Características destacadas (bullets) */
  features?: string[];
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cocinas: "Cocinas",
  closets: "Closets & Vestiers",
  banos: "Baños",
  "sala-comedor": "Sala & Comedor",
  estudios: "Estudios & Oficinas",
};

export function formatPriceCOP(amount: number): string {
  return amount.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
