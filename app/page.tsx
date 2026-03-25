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
  { seed: "hm-cocina-1", label: "Cocina a medida" },
  { seed: "hm-closet-2", label: "Closet integrado" },
  { seed: "hm-sala-3", label: "Sala y comedor" },
  { seed: "hm-detalle-4", label: "Acabado en madera" },
  { seed: "hm-bano-5", label: "Mueble de baño" },
  { seed: "hm-taller-6", label: "Proceso de fabricación" },
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

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section data-track-section="home-hero" className="border-b border-neutral-200 bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-12 lg:grid-cols-5 lg:items-center">

            {/* Texto */}
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Colombia · Carpintería digital
              </p>
              <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
                Hay espacios que cambian cómo te sientes al llegar a casa.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
                Los diseñamos y construimos contigo — proceso claro, precios transparentes
                y experiencia que vale la pena.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/proyectos"
                  className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-4 text-sm font-medium tracking-wide text-paper hover:bg-neutral-800"
                >
                  Cotizar mi proyecto
                </Link>
                <Link
                  href="/proyectos"
                  className="inline-flex items-center justify-center border border-ink px-6 py-4 text-sm font-medium tracking-wide text-ink hover:bg-ink hover:text-paper"
                >
                  Ver cómo funciona
                </Link>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track-location="hero"
                  className="inline-flex items-center justify-center px-2 py-4 text-sm text-ink-muted underline underline-offset-4 hover:text-ink sm:px-4"
                >
                  Hablar por WhatsApp
                </a>
              </div>
            </div>

            {/* Imagen hero — placeholder */}
            <div className="hidden lg:col-span-2 lg:block">
              <div className="aspect-[4/5] w-full overflow-hidden border border-neutral-200 bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://picsum.photos/seed/hm-hero-main/800/1000"
                  alt="Espacio a medida por Hechomadera"
                  width={800}
                  height={1000}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. BARRA DE PRUEBA ──────────────────────────────────── */}
      <section data-track-section="home-proof-bar" className="border-b border-neutral-200 bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <ul className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-12 md:gap-20">
            {stats.map((s) => (
              <li key={s.label} className="flex items-baseline gap-2">
                <span className="font-display text-xl font-semibold text-paper">{s.value}</span>
                <span className="text-xs uppercase tracking-wider text-paper/50">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 3. PROCESO ──────────────────────────────────────────── */}
      <section data-track-section="home-proceso" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">El proceso</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold text-ink md:text-4xl">
            Así funciona, de principio a fin.
          </h2>
          <p className="mt-3 max-w-lg text-ink-muted">
            Sabes exactamente qué pasa en cada paso — antes de comprometer un solo peso.
          </p>

          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.number} className="border border-neutral-200 bg-white p-8">
                <span className="font-display text-4xl font-semibold text-neutral-200">{s.number}</span>
                <h3 className="mt-4 font-medium text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <Link
              href="/proyectos"
              className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              Ver el proceso completo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. DOS FORMAS DE TRABAJAR ───────────────────────────── */}
      <section data-track-section="home-dos-formas" className="border-b border-neutral-200 bg-paper-dim">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Cómo trabajamos</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold text-ink md:text-4xl">
            ¿Ya sabes lo que quieres o estás empezando a imaginar?
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {/* Tienda */}
            <div className="flex flex-col border border-neutral-200 bg-white p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Tienda</p>
              <h3 className="font-display mt-3 text-2xl font-semibold text-ink">
                Productos con precio fijo.
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
                Elige, paga hoy y coordina la entrega. Precios en pesos colombianos,
                pago 100% online con Mercado Pago.{" "}
                <span className="text-ink">{siteConfig.business.marketplaceShippingNote}</span>
              </p>
              <div className="mt-8">
                <Link
                  href="/tienda"
                  className="inline-flex items-center justify-center border border-ink px-5 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
                >
                  Ver tienda →
                </Link>
              </div>
            </div>

            {/* Proyectos */}
            <div className="flex flex-col border border-ink bg-ink p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-paper/50">
                Proyectos a medida
              </p>
              <h3 className="font-display mt-3 text-2xl font-semibold text-paper">
                Tu espacio, exactamente como lo imaginaste.
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-paper/70">
                Cotización sin costo. Diseño y renders antes de fabricar.
                Abono inicial del {siteConfig.business.depositPercentDefault}% al confirmar —
                saldo al finalizar.{" "}
                <span className="text-paper/90">{siteConfig.business.projectShippingNote}</span>
              </p>
              <div className="mt-8">
                <Link
                  href="/proyectos"
                  className="inline-flex items-center justify-center border border-paper bg-paper px-5 py-3 text-sm font-medium text-ink hover:bg-neutral-100"
                >
                  Cotizar proyecto →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. GALERÍA ──────────────────────────────────────────── */}
      <section data-track-section="home-galeria" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Nuestro trabajo</p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-ink md:text-4xl">
            El trabajo habla.
          </h2>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <li key={item.seed} className="overflow-hidden border border-neutral-200 bg-neutral-100">
                <div className="aspect-[4/3] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://picsum.photos/seed/${item.seed}/800/600`}
                    alt={item.label}
                    width={800}
                    height={600}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
                  {item.label}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Link
              href="/inspiracion"
              className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              Ver más en Inspiración →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. COBERTURA ────────────────────────────────────────── */}
      <section data-track-section="home-cobertura" className="border-b border-neutral-200 bg-paper-dim">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Cobertura</p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-ink md:text-4xl">
                Llegamos a donde estás.
              </h2>
              <p className="mt-4 text-ink-muted">
                Presencia en {siteConfig.cities.length} ciudades de Colombia,
                con asesores listos para acompañarte desde el primer contacto hasta la instalación.
              </p>
              <div className="mt-6">
                <Link
                  href="/contacto"
                  className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  Consultar disponibilidad en mi ciudad →
                </Link>
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-2">
              {siteConfig.cities.map((city) => (
                <li
                  key={city}
                  className="border border-neutral-200 bg-white px-4 py-3 text-sm text-ink"
                >
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 7. RESEÑAS (placeholders) — OCULTO hasta tener reseñas reales ── */}
      {false && <section data-track-section="home-resenas" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Reseñas</p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-ink md:text-4xl">
            Lo que dicen quienes ya lo vivieron.
          </h2>

          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <li
                key={r.name}
                className="flex flex-col border border-dashed border-neutral-300 bg-paper-dim p-6"
              >
                {/* Estrellas placeholder */}
                <div className="flex gap-0.5" aria-label="5 estrellas">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-sm text-neutral-300">★</span>
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm italic leading-relaxed text-ink-muted">
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="mt-6 border-t border-neutral-200 pt-4">
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
        </div>
      </section>}

      {/* ── 8. CTA FINAL ────────────────────────────────────────── */}
      <section data-track-section="home-cta-final" className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold leading-tight text-paper md:text-4xl lg:text-5xl">
              Tu proyecto empieza con una conversación.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-paper/70">
              Sin compromiso. Sin visita previa.
              Solo cuéntanos qué tienes en mente.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/proyectos"
                className="inline-flex items-center justify-center border border-paper bg-paper px-8 py-4 text-sm font-medium tracking-wide text-ink hover:bg-neutral-100"
              >
                Cotizar mi proyecto
              </Link>
              <a
                href={waContact}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="cta_final"
                className="inline-flex items-center justify-center border border-paper/30 px-8 py-4 text-sm font-medium tracking-wide text-paper hover:border-paper"
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
