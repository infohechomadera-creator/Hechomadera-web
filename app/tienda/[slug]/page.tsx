import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import products from "@/content/products.json";
import { StartCheckoutButton } from "@/components/payments/StartCheckoutButton";
import { ProductGallery } from "@/components/business/ProductGallery";
import { ProductViewTracker } from "@/components/analytics/ProductViewTracker";
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
    <div className="contenedor py-8 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <ProductViewTracker productId={product.id} productName={product.name} price={product.priceCOP} />

      {/* breadcrumb */}
      <p className="mb-6 text-[13px] text-ink-soft md:mb-8">
        <Link href="/tienda" className="rounded-badge text-ink-muted underline-offset-4 hover:text-ink hover:underline">Tienda</Link>
        {categoryLabel && (
          <> / <span>{categoryLabel}</span></>
        )}
        {" "}/ <span className="font-medium text-graphite">{product.name}</span>
      </p>

      {/* ── two-column layout ──────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">

        {/* left: gallery */}
        <div className="min-w-0">
          <ProductGallery images={images} />
        </div>

        {/* right: product info */}
        <div className="flex flex-col items-start">

          {/* category badge */}
          {categoryLabel && (
            <p className="etiqueta-ember">
              {categoryLabel}
            </p>
          )}

          {/* name */}
          <h1 className="titulo-seccion mt-4 text-balance leading-[1.15]">
            {product.name}
          </h1>

          {/* material */}
          {product.material && (
            <p className="mt-3 text-body text-ink-muted">{product.material}</p>
          )}

          {/* price */}
          <p className="mt-6 font-display text-heading-sm font-semibold tracking-[-0.015em] text-ink">
            {formatPriceCOP(product.priceCOP)}
          </p>
          <p className="mt-1 text-caption text-ink-soft">
            {siteConfig.business.marketplaceShippingNote}
          </p>

          {/* CTA block */}
          <div className="tarjeta mt-6 w-full p-6 md:p-7">
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
              data-track-location="producto_cta"
              className="boton-borde mt-3 w-full py-3.5"
            >
              Preguntar por WhatsApp
            </a>

            {/* trust signals */}
            <ul className="mt-6 space-y-3 border-t border-cloud pt-5">
              {[
                "Pago 100% seguro procesado por Mercado Pago.",
                "Confirmación por email inmediatamente después de pagar.",
                "Un asesor te contacta en menos de 3 horas.",
              ].map((txt) => (
                <li key={txt} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-bold text-ink">&#10003;</span>
                  {txt}
                </li>
              ))}
            </ul>
          </div>

          {/* description */}
          {product.description && (
            <div className="mt-8 w-full">
              <p className="eyebrow">
                Descripción
              </p>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">
                {product.description}
              </p>
            </div>
          )}

          {/* dimensions */}
          {product.dimensions && (
            <div className="tarjeta-suave mt-6 w-full p-6">
              <p className="eyebrow">
                Dimensiones orientativas
              </p>
              <ul className="mt-3 divide-y divide-cloud">
                {product.dimensions.ancho && (
                  <li className="flex justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink-muted">Ancho</span>
                    <span className="font-medium text-ink">{product.dimensions.ancho}</span>
                  </li>
                )}
                {product.dimensions.alto && (
                  <li className="flex justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink-muted">Alto</span>
                    <span className="font-medium text-ink">{product.dimensions.alto}</span>
                  </li>
                )}
                {product.dimensions.profundidad && (
                  <li className="flex justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink-muted">Profundidad</span>
                    <span className="font-medium text-ink">{product.dimensions.profundidad}</span>
                  </li>
                )}
              </ul>
              <p className="mt-3 text-caption text-ink-soft">
                Fabricamos a medida — estas son referencias típicas del modelo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── features section ────────────────────────────────── */}
      {product.features && product.features.length > 0 && (
        <div className="mt-16 md:mt-24">
          <h2 className="titulo-seccion">
            Características
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {product.features.map((feat) => (
              <li key={feat} className="tarjeta flex items-start gap-4 p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-badge border border-cloud bg-paper text-sm font-semibold text-ink">
                  +
                </span>
                <span className="pt-1 text-sm leading-relaxed text-ink-muted">{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── process note ────────────────────────────────────── */}
      <div className="bloque-oscuro mt-16 grid gap-8 p-8 md:mt-24 md:p-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
        <div className="max-w-2xl">
          <h2 className="titulo-seccion text-snow">
            ¿Cómo funciona el proceso?
          </h2>
          <p className="mt-4 text-body leading-relaxed text-ash">
            Este producto se fabrica a medida. Al comprar online inicias el proceso: un asesor te
            contacta en menos de 3 horas para confirmar medidas, materiales y tiempo de entrega.
            El pago del saldo se coordina según cotización final.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href="/proyectos"
            className="boton-claro"
          >
            Ver cómo funciona
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="producto_proceso"
            className="boton border border-steel text-snow hover:bg-slate"
          >
            Preguntar antes de comprar
          </a>
        </div>
      </div>

      <p className="mt-10 text-center text-sm">
        <Link href="/tienda" className="boton-neutro boton-pill border border-cloud">
          ← Volver a la tienda
        </Link>
      </p>
    </div>
  );
}
