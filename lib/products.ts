/**
 * Catálogo marketplace — fuente: content/products.json
 * Añade o edita productos ahí (no hardcodear listas largas en componentes).
 */
export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  priceCOP: number;
  /** Texto corto para ficha / SEO */
  description?: string;
};

export function formatPriceCOP(amount: number): string {
  return amount.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
