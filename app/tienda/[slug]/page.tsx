import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import products from "@/content/products.json";
import { StartCheckoutButton } from "@/components/payments/StartCheckoutButton";
import { ProductGallery } from "@/components/business/ProductGallery";
import { siteConfig } from "@/lib/site-config";
import { formatPriceCOP, CATEGORY_LABELS, type StoreProduct } from "@/lib/products";
import { getWhatsAppHref } from "@/lib/whatsapp";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const list = products as StoreProduct[];
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = products as StoreProduct[];
  const product = list.find((p) => p.slug === slug);
  if (!product) return { title: "Producto" };
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${siteConfig.name}`,
  };
}

function buildImages(product: StoreProduct): { src: string; alt: string }[] {
  const seeds: string[] = [];
  if (product.imageSlug) seeds.push(product.imageSlug);
  if (product.gallerySlug) seeds.push(...product.gallerySlug);
  if (seeds.length === 0) seeds.push(product.id);
  return seeds.map((s, i) => ({
    src: `https://picsum.photos/seed/${s}/800/800`,
    alt: i === 0 ? product.name : `${product.name} — vista ${i + 1}`,
  }));
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const list = products as StoreProduct[];
  const product = list.find((p) => p.slug === slug);

  if (!product) notFound();

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://hechomadera.com").replace(/\/$/, "");
  const images = buildImages(product);
  const categoryLabel = product.category ? CATEGORY_LABELS[product.category] : null;
  const titleCheckout = `Pedido — ${product.name}`;

  const wa = getWhatsAppHref(
    `Hola Hechomadera, estoy viendo el producto "${product.name}" y quiero más información o una cotización a medida.`,
  );

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.name,
    url: `${base}/tienda/${product.slug}`,
    brand: { "@type": "Brand", name: "Hechomadera" },
    offers: {
      "@type": "Offer",
      price: product.priceCOP,
      priceCurrency: "COP",
      availability: "https://schema.org/InStock",
      url: `${base}/tienda/${product.slug}`,
      seller: { "@type": "Organization", name: "Hechomadera" },
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* breadcrumb */}
      <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <Link href="/tienda" className="hover:underline">Tienda</Link>
        {categoryLabel && (
          <> / <span>{categoryLabel}</span></>
        )}
        {" "}/ <span className="text-ink">{product.name}</span>
      </p>

      {/* ── two-column layout ──────────────────────────────── */}
      <div className="grid gap-10 lg:grid-cols-[1fr_420px]">

        {/* left: gallery */}
        <div className="min-w-0">
          <ProductGallery images={images} />
        </div>

        {/* right: product info */}
        <div className="flex flex-col">

          {/* category badge */}
          {categoryLabel && (
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {categoryLabel}
            </p>
          )}

          {/* name */}
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">
            {product.name}
          </h1>

          {/* material */}
          {product.material && (
            <p className="mt-2 text-sm text-ink-muted">{product.material}</p>
          )}

          {/* price */}
          <p className="mt-5 font-display text-3xl font-semibold text-ink">
            {formatPriceCOP(product.priceCOP)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {siteConfig.business.marketplaceShippingNote}
          </p>

          {/* CTA block */}
          <div className="mt-7 border border-neutral-200 bg-white p-6">
            <StartCheckoutButton
              title={titleCheckout}
              unitPrice={product.priceCOP}
              quantity={1}
              externalReference={`tienda-${product.id}`}
            />

            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-ink hover:border-ink"
            >
              Preguntar por WhatsApp
            </a>

            {/* trust signals */}
            <ul className="mt-6 space-y-2.5 border-t border-neutral-100 pt-5">
              {[
                "Pago 100% seguro procesado por Mercado Pago.",
                "Confirmación por email inmediatamente después de pagar.",
                "Un asesor te contacta en menos de 3 horas.",
              ].map((txt) => (
                <li key={txt} className="flex items-start gap-2 text-xs text-ink-muted">
                  <span className="mt-px shrink-0 font-bold text-ink">&#10003;</span>
                  {txt}
                </li>
              ))}
            </ul>
          </div>

          {/* description */}
          {product.description && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Descripción
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {product.description}
              </p>
            </div>
          )}

          {/* dimensions */}
          {product.dimensions && (
            <div className="mt-6 border-t border-neutral-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Dimensiones orientativas
              </p>
              <ul className="mt-3 space-y-1.5">
                {product.dimensions.ancho && (
                  <li className="flex justify-between text-sm">
                    <span className="text-ink-muted">Ancho</span>
                    <span className="font-medium text-ink">{product.dimensions.ancho}</span>
                  </li>
                )}
                {product.dimensions.alto && (
                  <li className="flex justify-between text-sm">
                    <span className="text-ink-muted">Alto</span>
                    <span className="font-medium text-ink">{product.dimensions.alto}</span>
                  </li>
                )}
                {product.dimensions.profundidad && (
                  <li className="flex justify-between text-sm">
                    <span className="text-ink-muted">Profundidad</span>
                    <span className="font-medium text-ink">{product.dimensions.profundidad}</span>
                  </li>
                )}
              </ul>
              <p className="mt-2 text-xs text-ink-muted">
                Fabricamos a medida — estas son referencias típicas del modelo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── features section ────────────────────────────────── */}
      {product.features && product.features.length > 0 && (
        <div className="mt-14 border-t border-neutral-200 pt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Características
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.features.map((feat) => (
              <li key={feat} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-ink text-xs font-bold text-ink">
                  +
                </span>
                <span className="text-sm text-ink-muted">{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── process note ────────────────────────────────────── */}
      <div className="mt-14 border border-neutral-200 bg-neutral-50 p-8">
        <h2 className="font-display text-lg font-semibold text-ink">
          ¿Cómo funciona el proceso?
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Este producto se fabrica a medida. Al comprar online inicias el proceso: un asesor te
          contacta en menos de 3 horas para confirmar medidas, materiales y tiempo de entrega.
          El pago del saldo se coordina según cotización final.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/proyectos"
            className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-neutral-800"
          >
            Ver cómo funciona
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center border border-neutral-300 px-5 py-2.5 text-sm font-medium text-ink hover:border-ink"
          >
            Preguntar antes de comprar
          </a>
        </div>
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href="/tienda" className="text-ink-muted underline hover:text-ink">
          ← Volver a la tienda
        </Link>
      </p>
    </div>
  );
}
