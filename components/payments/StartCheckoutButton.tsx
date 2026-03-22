"use client";

import { useState } from "react";

type Props = {
  label?: string;
  /** Precio en COP (entero) */
  unitPrice: number;
  title: string;
  quantity?: number;
};

export function StartCheckoutButton({ label = "Pagar con Mercado Pago", unitPrice, title, quantity = 1 }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, unit_price: unitPrice, quantity }),
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
