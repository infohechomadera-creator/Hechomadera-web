"use client";

import { useMemo, useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { formatPriceCOP } from "@/lib/products";
import { getWhatsAppHref } from "@/lib/whatsapp";

/**
 * Estimación orientativa del abono inicial (% configurable en site-config).
 * No sustituye cotización formal.
 */
export function DepositCalculator() {
  const pct = siteConfig.business.depositPercentDefault;
  const [input, setInput] = useState("");

  const amount = useMemo(() => {
    const n = parseInt(input.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [input]);

  const deposit = amount > 0 ? Math.round((amount * pct) / 100) : 0;

  const wa = getWhatsAppHref(
    amount > 0
      ? `Hola Hechomadera, quiero cotizar un proyecto a medida. Tengo un valor referencial de ${formatPriceCOP(amount)} y quiero entender el abono del ${pct}%.`
      : "Hola Hechomadera, quiero cotizar un proyecto a medida y entender el abono inicial.",
  );

  return (
    <div className="border border-neutral-200 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Abono estimado (referencia)</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Usamos un abono inicial típico del <strong>{pct}%</strong> sobre el valor acordado en cotización (puede variar según el proyecto). Introduce un
        monto orientativo para ver una estimación.
      </p>
      <label htmlFor="deposit-estimate" className="mt-6 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Valor estimado del proyecto (COP)
      </label>
      <input
        id="deposit-estimate"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Ej. 8.000.000"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mt-2 w-full border border-neutral-300 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
      />
      <p className="mt-4 text-sm text-ink-muted">
        Abono estimado ({pct}%):{" "}
        <strong className="text-ink">{amount > 0 ? formatPriceCOP(deposit) : "—"}</strong>
      </p>
      <p className="mt-2 text-xs text-ink-muted">Los cifras finales salen de la cotización formal. Esto es solo orientativo.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Pedir cotización por WhatsApp
        </a>
        <a href="/contacto" className="inline-flex items-center justify-center border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink">
          Formulario de contacto
        </a>
      </div>
    </div>
  );
}
