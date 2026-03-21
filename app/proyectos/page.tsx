import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Proyectos a medida",
  description: "Cotización con precio desde, abono inicial y acompañamiento. Envío incluido en proyectos según alcance.",
};

export default function ProyectosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Proyectos a medida</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Mostramos <strong>precio desde</strong>; el valor final depende de cotización. Abono inicial típico{" "}
        <strong>{siteConfig.business.depositPercentDefault}%</strong> por web (configurable). Saldo: online o con asesor.{" "}
        {siteConfig.business.projectShippingNote}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/contacto">Solicitar cotización</Button>
        <Button href="/como-funciona" variant="secondary">
          Ver cómo funciona
        </Button>
      </div>
    </div>
  );
}
