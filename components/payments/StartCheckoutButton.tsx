"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Props = {
  label?: string;
  /** Precio en COP (entero) */
  unitPrice: number;
  title: string;
  quantity?: number;
  /** Referencia para Mercado Pago (webhooks / conciliación), ej. tienda-{id} */
  externalReference?: string;
};

export function StartCheckoutButton({
  label = "Pagar con Mercado Pago",
  unitPrice,
  title,
  quantity = 1,
  externalReference,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    track("checkout_start", { product: title, price: unitPrice });
    try {
      const res = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          unit_price: unitPrice,
          quantity,
          ...(externalReference ? { external_reference: externalReference } : {}),
        }),
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
        className="w-full border border-accent bg-accent px-4 py-3 text-sm font-medium text-paper hover:bg-accent-hover disabled:opacity-60"
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
