import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description: "Pasos desde el primer contacto hasta la entrega: medidas, cotización, abono, fabricación e instalación.",
};

const steps = [
  { title: "1. Contacto y referencias", body: "Nos cuentas tu visión; puedes enviar medidas aproximadas o solicitar visita técnica." },
  { title: "2. Cotización inicial", body: "Propuesta y precio desde; aclaramos alcance y tiempos." },
  { title: "3. Abono y validación", body: "Abono inicial por web; visita para ajuste de medidas si aplica." },
  { title: "4. Fabricación e instalación", body: "Producción, entrega e instalación con seguimiento." },
];

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Cómo funciona</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Proceso pensado para reducir la informalidad típica de obra: claridad, seguridad en pagos y tiempos acordados. En la{" "}
        <strong>tienda</strong> el pago es 100% online con Mercado Pago; en <strong>proyectos a medida</strong> el abono y el saldo se acuerdan según
        cotización.
      </p>
      <ol className="mt-10 space-y-6">
        {steps.map((s) => (
          <li key={s.title} className="border-l-2 border-ink pl-6">
            <h2 className="font-medium text-ink">{s.title}</h2>
            <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
