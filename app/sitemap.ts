import type { MetadataRoute } from "next";
import products from "@/content/products.json";
import type { StoreProduct } from "@/lib/products";

/** Rutas públicas indexables. Las legales tienen `noindex` hasta texto definitivo — no van al sitemap. */
const STATIC_PATHS = [
  "",
  "/tienda",
  "/proyectos",
  "/inspiracion",
  "/nosotros",
  "/contacto",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/tienda" || path === "/contacto" ? 0.9 : 0.7,
  }));

  const list = products as StoreProduct[];
  const productEntries: MetadataRoute.Sitemap = list.map((p) => ({
    url: `${base}/tienda/${p.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  return [...staticEntries, ...productEntries];
}
