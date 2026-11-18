import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartCheckoutButton } from "@/components/payments/StartCheckoutButton";

/** En producción, la ruta solo existe si ENABLE_PAYMENT_TEST_PAGE=true en Vercel. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prueba de pago",
  robots: { index: false, follow: false },
};

/**
 * Página solo para validar integración Mercado Pago (Checkout Pro).
 * Añade MERCADOPAGO_ACCESS_TOKEN en Vercel y NEXT_PUBLIC_SITE_URL con tu URL pública.
 */
export default function PagoPruebaPage() {
  const isProd = process.env.NODE_ENV === "production";
  const testEnabled = process.env.ENABLE_PAYMENT_TEST_PAGE === "true";
  if (isProd && !testEnabled) {
    notFound();
  }

  return (
    <div className="contenedor py-14 md:py-24">
      <div className="tarjeta mx-auto max-w-xl p-7 md:p-10">
        <h1 className="titulo-tarjeta">Prueba de pago (Mercado Pago)</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Usa credenciales de <strong className="font-semibold text-ink">prueba</strong> en Mercado Pago para no cobrar dinero real. Monto de ejemplo: $5.000 COP.
        </p>
        <div className="mt-8">
          <StartCheckoutButton title="Pedido de prueba — Hechomadera" unitPrice={5000} quantity={1} />
        </div>
        <p className="mt-8 text-caption text-ink-soft">
          Si ves error 503, falta configurar <code className="rounded-badge bg-paper px-1.5 py-0.5 text-ink">MERCADOPAGO_ACCESS_TOKEN</code> en
          Vercel y redeploy.
        </p>
      </div>
    </div>
  );
}
