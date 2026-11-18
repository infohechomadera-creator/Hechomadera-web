import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inspiración — Cocinas Integrales, Closets y Ebanistería a Medida",
  description:
    "Galería de cocinas integrales, closets modernos, vestidores, muebles de madera y proyectos de remodelación en Colombia. Inspírate para tu proyecto de carpintería arquitectónica o ebanistería.",
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
    <div className="contenedor seccion">
      <h1 className="titulo-display">Inspiración</h1>
      <p className="mt-5 max-w-2xl text-body-lg text-ink-muted">
        Referencias visuales para acompañar tu decisión. Las imágenes siguientes son de demostración; en una siguiente fase podemos
        sustituirlas por fotos propias de proyectos Hechomadera.
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
        {PLACEHOLDER_IMAGES.map((item) => (
          <li key={item.seed} className="tarjeta overflow-hidden">
            {/* Imágenes demo (picsum) — reemplazar por activos propios */}
            <div className="aspect-[4/3] w-full bg-paper">
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
            <p className="px-7 py-5 text-base font-medium text-ink">{item.label}</p>
          </li>
        ))}
      </ul>

      <div className="tarjeta mt-10 flex flex-col gap-3 p-7 sm:flex-row sm:flex-wrap sm:items-center md:mt-14">
        <Link
          href="/proyectos"
          className="boton-primario"
        >
          Cotizar proyecto
        </Link>
        <Link
          href="/tienda"
          className="boton-borde"
        >
          Ver tienda
        </Link>
        <Link href="/contacto" className="inline-flex items-center justify-center px-2 py-3 text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
          Hablar con un asesor
        </Link>
      </div>
    </div>
  );
}
