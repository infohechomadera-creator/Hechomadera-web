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
    <div className="mx-auto max-w-lg px-4 py-16 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Prueba de pago (Mercado Pago)</h1>
      <p className="mt-4 text-sm text-ink-muted">
        Usa credenciales de <strong>prueba</strong> en Mercado Pago para no cobrar dinero real. Monto de ejemplo: $5.000 COP.
      </p>
      <div className="mt-10">
        <StartCheckoutButton title="Pedido de prueba — Hechomadera" unitPrice={5000} quantity={1} />
      </div>
      <p className="mt-8 text-xs text-ink-muted">
        Si ves error 503, falta configurar <code className="rounded bg-neutral-100 px-1">MERCADOPAGO_ACCESS_TOKEN</code> en
        Vercel y redeploy.
      </p>
    </div>
  );
}
