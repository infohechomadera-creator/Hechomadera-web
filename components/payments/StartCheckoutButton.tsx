"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

/**
 * El navegador nunca manda el precio (W5): solo dice qué se paga y el servidor calcula el valor.
 *  - `productId`: producto de la tienda (precio de content/products.json).
 *  - `pagoToken`: enlace de pago de un lead (diseño, anticipo o saldo).
 *  - `prueba`: página de prueba de pago (solo gerencia).
 * `title` y `unitPrice` son solo para la medición (analytics).
 */
type Props = {
  label?: string;
  unitPrice: number;
  title: string;
  productId?: string;
  pagoToken?: string;
  prueba?: boolean;
};

export function StartCheckoutButton({
  label = "Pagar con Mercado Pago",
  unitPrice,
  title,
  productId,
  pagoToken,
  prueba,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    track("checkout_start", { product: title, price: unitPrice });
    try {
      const res = await fetch(pagoToken ? "/api/pagos/lead" : "/api/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pagoToken ? { token: pagoToken } : prueba ? { prueba: true } : { producto: productId }),
      });
      const data = (await res.json()) as { redirect_url?: string; error?: string; hint?: string; details?: unknown };

      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar el pago.");
        return;
      }

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      setError("Respuesta sin URL de pago.");
    } catch {
      setError("Error de red. Intenta de nuevo.");
      track("checkout_error", { product: title, reason: "network" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full border border-ink bg-ink px-4 py-3 text-sm font-medium text-paper hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading ? "Redirigiendo…" : label}
      </button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
