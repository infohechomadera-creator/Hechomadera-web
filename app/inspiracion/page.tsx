import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inspiración",
  description:
    "Espacios diseñados y construidos por Hechomadera. Cocinas, closets, salas y proyectos a medida en Colombia. Encuentra inspiración para tu próxima remodelación.",
};

const PLACEHOLDER_IMAGES = [
  { seed: "hm-wood-1", label: "Madera y texturas" },
  { seed: "hm-kitchen-2", label: "Cocinas sobrias" },
  { seed: "hm-closet-3", label: "Organización" },
  { seed: "hm-light-4", label: "Luz natural" },
  { seed: "hm-detail-5", label: "Detalle artesanal" },
  { seed: "hm-space-6", label: "Espacios integrados" },
] as const;

export default function InspiracionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Inspiración</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Referencias visuales para acompañar tu decisión. Las imágenes siguientes son de demostración; en una siguiente fase podemos
        sustituirlas por fotos propias de proyectos Hechomadera.
      </p>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_IMAGES.map((item) => (
          <li key={item.seed} className="overflow-hidden border border-neutral-200 bg-white">
            {/* Imágenes demo (picsum) — reemplazar por activos propios */}
            <div className="aspect-[4/3] w-full bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/${item.seed}/800/600`}
                alt=""
                width={800}
                height={600}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="p-4 text-sm font-medium text-ink">{item.label}</p>
          </li>
        ))}
      </ul>

      <div className="mt-14 flex flex-wrap gap-4 border-t border-neutral-200 pt-10">
        <Link
          href="/proyectos"
          className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
        >
          Cotizar proyecto
        </Link>
        <Link
          href="/tienda"
          className="inline-flex items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-ink hover:border-ink"
        >
          Ver tienda
        </Link>
        <Link href="/contacto" className="inline-flex items-center justify-center text-sm text-ink-muted underline hover:text-ink">
          Hablar con un asesor
        </Link>
      </div>
    </div>
  );
}
