import Link from "next/link";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { siteConfig } from "@/lib/site-config";

const wa = getWhatsAppHref("Hola, quiero cotizar un proyecto con Hechomadera.");
const waContact = getWhatsAppHref("Hola, quiero hablar sobre un proyecto con Hechomadera.");

const steps = [
  {
    number: "01",
    title: "Cuéntanos tu visión",
    body: "Online, sin visita previa. Solo dinos qué tienes en mente y el espacio que quieres transformar.",
  },
  {
    number: "02",
    title: "Diseñamos juntos",
    body: "Renders e inteligencia artificial antes de fabricar. Ves el resultado antes de que exista.",
  },
  {
    number: "03",
    title: "Fabricamos e instalamos",
    body: "Con tiempos acordados y seguimiento en cada etapa. Sin sorpresas, sin excusas.",
  },
] as const;

const gallery = [
  { seed: "hm-cocina-1", label: "Cocina a medida", alt: "Cocina integral a medida en madera — carpintería arquitectónica Hechomadera Colombia" },
  { seed: "hm-closet-2", label: "Closet integrado", alt: "Closet a medida empotrado — ebanistería y muebles de madera Colombia" },
  { seed: "hm-sala-3", label: "Sala y comedor", alt: "Muebles de sala y comedor a medida — carpintería y ebanistería Colombia" },
  { seed: "hm-detalle-4", label: "Acabado en madera", alt: "Detalle de mueble de madera — muebles a medida con herrajes Blum Colombia" },
  { seed: "hm-bano-5", label: "Mueble de baño", alt: "Mueble de baño a medida en MDF lacado — vanitorios y ebanistería Colombia" },
  { seed: "hm-taller-6", label: "Proceso de fabricación", alt: "Taller de fabricación Hechomadera — cocinas integrales y closets a medida en Colombia" },
] as const;

const reviews = [
  {
    name: "María C.",
    city: "Bogotá",
    text: "Espacio para reseña real. Conectar con Google Reviews o Trustpilot cuando estén disponibles.",
  },
  {
    name: "Andrés M.",
    city: "Medellín",
    text: "Espacio para reseña real. Conectar con Google Reviews o Trustpilot cuando estén disponibles.",
  },
  {
    name: "Laura P.",
    city: "Barranquilla",
    text: "Espacio para reseña real. Conectar con Google Reviews o Trustpilot cuando estén disponibles.",
  },
] as const;

const stats = [
  { value: "30 años", label: "de oficio" },
  { value: "10 ciudades", label: "de cobertura" },
  { value: "Constructoras", label: "como respaldo" },
] as const;

export default function HomePage() {
  return (
    <div>

      {/* ── 1. HERO — titular grande + imagen redondeada ───────────── */}
      <section data-track-section="home-hero" className="contenedor pt-8 md:pt-14">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <p className="etiqueta gap-2 bg-snow">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />
              Colombia · Carpintería digital
            </p>
            <h1 className="titulo-display mt-5 max-w-3xl text-balance">
              Hay espacios que cambian cómo te sientes al llegar a casa.
            </h1>
          </div>
          <div className="lg:pb-2">
            <p className="text-body-lg text-ink-muted">
              Los diseñamos y construimos contigo — proceso claro, precios transparentes
              y experiencia que vale la pena.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/proyectos" className="boton-primario">
                Cotizar mi proyecto
              </Link>
              <Link href="/proyectos" className="boton-neutro">
                Ver cómo funciona
              </Link>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="hero"
                className="inline-flex items-center justify-center px-3 py-3 text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-card md:rounded-section">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/banner.png"
            alt="Cocina integral a medida — carpintería arquitectónica y ebanistería por Hechomadera Colombia"
            className="aspect-[4/3] w-full object-cover object-center md:aspect-[21/9]"
          />
        </div>
      </section>

      {/* ── 2. BARRA DE PRUEBA — cifras ─────────────────────────────── */}
      <section data-track-section="home-proof-bar" className="contenedor pt-10 md:pt-14">
        <ul className="grid gap-px overflow-hidden rounded-card border border-cloud bg-cloud sm:grid-cols-3">
          {stats.map((s) => (
            <li key={s.label} className="flex items-baseline gap-3 bg-snow px-7 py-6">
              <span className="font-display text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink md:text-heading">
                {s.value}
              </span>
              <span className="text-sm text-steel">{s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 3. PROCESO ──────────────────────────────────────────── */}
      <section data-track-section="home-proceso" className="contenedor seccion">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="eyebrow">El proceso</p>
            <h2 className="titulo-seccion mt-3 max-w-xl">Así funciona, de principio a fin.</h2>
          </div>
          <p className="max-w-lg text-ink-muted md:justify-self-end">
            Sabes exactamente qué pasa en cada paso — antes de comprometer un solo peso.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.number} className="tarjeta flex flex-col p-7">
              <span className="text-sm font-medium text-ink-soft">{s.number}</span>
              <h3 className="titulo-tarjeta mt-10">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <Link href="/proyectos" className="boton-neutro">
            Ver el proceso completo →
          </Link>
        </div>
      </section>

      {/* ── 4. DOS FORMAS DE TRABAJAR ───────────────────────────── */}
      <section data-track-section="home-dos-formas" className="contenedor pb-14 md:pb-20">
        <p className="eyebrow">Cómo trabajamos</p>
        <h2 className="titulo-seccion mt-3 max-w-2xl text-balance">
          ¿Ya sabes lo que quieres o estás empezando a imaginar?
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {/* Tienda */}
          <div className="tarjeta flex flex-col p-7 md:p-9">
            <p className="etiqueta self-start">Tienda</p>
            <h3 className="mt-8 font-display text-heading-sm font-semibold leading-tight tracking-[-0.015em] text-ink">
              Productos con precio fijo.
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
              Elige, paga hoy y coordina la entrega. Precios en pesos colombianos,
              pago 100% online con Mercado Pago.{" "}
              <span className="text-ink">{siteConfig.business.marketplaceShippingNote}</span>
            </p>
            <div className="mt-8">
              <Link href="/tienda" className="boton-borde">
                Ver tienda →
              </Link>
            </div>
          </div>

          {/* Proyectos */}
          <div className="bloque-oscuro flex flex-col p-7 md:p-9">
            <p className="etiqueta-ember self-start">Proyectos a medida</p>
            <h3 className="mt-8 font-display text-heading-sm font-semibold leading-tight tracking-[-0.015em] text-snow">
              Tu espacio, exactamente como lo imaginaste.
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ash">
              Cotización sin costo. Diseño y renders antes de fabricar.
              Abono inicial del {siteConfig.business.depositPercentDefault}% al confirmar —
              saldo al finalizar.{" "}
              <span className="text-mist">{siteConfig.business.projectShippingNote}</span>
            </p>
            <div className="mt-8">
              <Link href="/proyectos" className="boton-claro">
                Cotizar proyecto →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. GALERÍA ──────────────────────────────────────────── */}
      <section data-track-section="home-galeria" className="contenedor pb-14 md:pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Nuestro trabajo</p>
            <h2 className="titulo-seccion mt-3">El trabajo habla.</h2>
          </div>
          <Link href="/inspiracion" className="boton-neutro self-start md:self-auto">
            Ver más en Inspiración →
          </Link>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item) => (
            <li key={item.seed} className="tarjeta overflow-hidden">
              <div className="aspect-[4/3] w-full overflow-hidden bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${item.seed}/800/600`}
                  alt={item.alt}
                  width={800}
                  height={600}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="px-7 py-5">
                <p className="titulo-tarjeta !text-base">{item.label}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 6. COBERTURA ────────────────────────────────────────── */}
      <section data-track-section="home-cobertura" className="contenedor pb-14 md:pb-20">
        <div className="tarjeta grid gap-10 p-7 md:grid-cols-2 md:items-center md:p-12">
          <div>
            <p className="eyebrow">Cobertura</p>
            <h2 className="titulo-seccion mt-3">Llegamos a donde estás.</h2>
            <p className="mt-4 text-ink-muted">
              Presencia en {siteConfig.cities.length} ciudades de Colombia,
              con asesores listos para acompañarte desde el primer contacto hasta la instalación.
            </p>
            <div className="mt-6">
              <Link href="/contacto" className="boton-primario">
                Consultar disponibilidad en mi ciudad →
              </Link>
            </div>
          </div>

          <ul className="flex flex-wrap gap-2">
            {siteConfig.cities.map((city) => (
              <li key={city} className="rounded-full border border-cloud bg-paper-dim px-4 py-2 text-sm text-graphite">
                {city}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 7. RESEÑAS (placeholders) — OCULTO hasta tener reseñas reales ── */}
      {false && <section data-track-section="home-resenas" className="contenedor pb-14 md:pb-20">
        <p className="eyebrow">Reseñas</p>
        <h2 className="titulo-seccion mt-3">Lo que dicen quienes ya lo vivieron.</h2>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.name} className="tarjeta flex flex-col p-7">
              {/* Estrellas placeholder */}
              <div className="flex gap-0.5" aria-label="5 estrellas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-sm text-mist">★</span>
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm italic leading-relaxed text-ink-muted">
                &ldquo;{r.text}&rdquo;
              </p>
              <div className="mt-6 border-t border-cloud pt-4">
                <p className="text-xs font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-ink-muted">{r.city}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-ink-muted">
          Próximamente: reseñas reales verificadas.
          {/* TODO: conectar Google Reviews o Trustpilot */}
        </p>
      </section>}

      {/* ── 8. CTA FINAL ────────────────────────────────────────── */}
      <section data-track-section="home-cta-final" className="contenedor">
        <div className="bloque-oscuro px-6 py-16 md:px-12 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-snow md:text-heading-lg">
              Tu proyecto empieza con una conversación.
            </h2>
            <p className="mt-6 text-body-lg text-ash">
              Sin compromiso. Sin visita previa.
              Solo cuéntanos qué tienes en mente.
            </p>
            <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Link href="/proyectos" className="boton-claro w-full sm:w-auto">
                Cotizar mi proyecto
              </Link>
              <a
                href={waContact}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="cta_final"
                className="boton w-full border border-iron text-snow hover:bg-slate sm:w-auto"
              >
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
