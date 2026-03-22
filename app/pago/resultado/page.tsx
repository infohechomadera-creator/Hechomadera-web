import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

export default async function PagoResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const labels: Record<string, string> = {
    aprobado: "Pago aprobado",
    rechazado: "Pago no completado",
    pendiente: "Pago pendiente",
  };
  const title = estado ? labels[estado] ?? "Resultado" : "Resultado del pago";

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center md:px-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-4 text-sm text-ink-muted">
        Esta página es provisional. Aquí conectaremos confirmación por API, comprobante y seguimiento del pedido.
      </p>
      <a
        href="/"
        className="mt-8 inline-block border border-ink px-6 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
      >
        Volver al inicio
      </a>
    </div>
  );
}
