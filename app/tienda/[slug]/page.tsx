import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import products from "@/content/products.json";
import { StartCheckoutButton } from "@/components/payments/StartCheckoutButton";
import { siteConfig } from "@/lib/site-config";
import { formatPriceCOP, type StoreProduct } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const list = products as StoreProduct[];
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = products as StoreProduct[];
  const product = list.find((p) => p.slug === slug);
  if (!product) {
    return { title: "Producto" };
  }
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${siteConfig.name}`,
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const list = products as StoreProduct[];
  const product = list.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  const titleCheckout = `Pedido — ${product.name}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <Link href="/tienda" className="hover:underline">
          Tienda
        </Link>{" "}
        / {product.name}
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold text-ink md:text-4xl">{product.name}</h1>
      <p className="mt-4 text-2xl font-medium text-ink">{formatPriceCOP(product.priceCOP)}</p>
      {product.description ? (
        <p className="mt-6 text-sm leading-relaxed text-ink-muted">{product.description}</p>
      ) : null}
      <p className="mt-6 text-sm text-ink-muted">{siteConfig.business.marketplaceShippingNote}</p>

      <div className="mt-10 border border-neutral-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Pago en línea</p>
        <p className="mt-2 text-sm text-ink-muted">
          Checkout con Mercado Pago (tarjetas y medios disponibles según MP). Serás redirigido a su sitio seguro.
        </p>
        <div className="mt-6">
          <StartCheckoutButton title={titleCheckout} unitPrice={product.priceCOP} quantity={1} />
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
