import type { Metadata } from "next";
import Link from "next/link";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Nosotros — Carpinteros con 30 Años de Oficio en Colombia",
  description:
    "Somos una carpintería arquitectónica con 30 años de experiencia. Muebles de madera, cocinas, closets y remodelación a medida en 10 ciudades de Colombia. La carpintería que combina oficio real con proceso digital.",
};

const stats = [
  { value: "30", label: "años de oficio" },
  { value: "10", label: "ciudades de cobertura" },
  { value: "100%", label: "proceso digital" },
] as const;

const pillars = [
  {
    title: "Diseñamos primero",
    body: "Ves tu espacio antes de que exista. Renders, inteligencia artificial y diseño de interiores para que no haya sorpresas — solo resultados.",
  },
  {
    title: "Todo desde donde estás",
    body: "Cotizas, apruebas y pagas en línea. Sin filas, sin visitas innecesarias, sin perder tiempo. El proceso corre, tú decides.",
  },
  {
    title: "Oficio real detrás",
    body: "30 años de carpintería artesanal, materias primas importadas y una red nacional que respalda cada proyecto — grande o pequeño.",
  },
] as const;

export default function NosotrosPage() {
  const wa = getWhatsAppHref("Hola, quiero conocer más sobre Hechomadera y cómo pueden ayudarme con mi proyecto.");

  return (
    <div>

      {/* WHY — apertura emocional */}
      <section data-track-section="nosotros-why" className="border-b border-neutral-200 bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Por qué existimos
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
            Creemos que remodelar tu hogar debería sentirse como un sueño, no sobrevivirse como una pesadilla.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted leading-relaxed">
            Existe un problema real: la informalidad convirtió algo tan personal como tu espacio en
            una fuente de estrés. Citas que no llegan, presupuestos que cambian, obras que no terminan.
            Hechomadera nació para cambiar eso — y para devolverte el placer de construir el hogar que imaginaste.
          </p>
        </div>
      </section>

      {/* HOW — cómo lo hacemos */}
      <section data-track-section="nosotros-how" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Cómo lo hacemos
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold text-ink md:text-4xl">
            La carpintería que ya conoces, reinventada para este siglo.
          </h2>
          <p className="mt-4 max-w-2xl text-ink-muted leading-relaxed">
            Unimos tres décadas de oficio artesanal con diseño de interiores, herramientas digitales
            e inteligencia artificial. El resultado: un proceso sin fricciones donde tú ves, apruebas
            y confías antes de que empiece la obra.
          </p>

          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <li key={p.title} className="border border-neutral-200 bg-white p-8">
                <h3 className="font-display text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats */}
      <section data-track-section="nosotros-stats" className="border-b border-neutral-200 bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <ul className="grid gap-10 sm:grid-cols-3">
            {stats.map((s) => (
              <li key={s.label} className="text-center">
                <p className="font-display text-5xl font-semibold text-paper">{s.value}</p>
                <p className="mt-2 text-sm text-paper/60 uppercase tracking-wider">{s.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHAT — quiénes somos */}
      <section data-track-section="nosotros-what" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Qué somos
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold text-ink md:text-4xl">
            Una carpintería digital con presencia en todo el país.
          </h2>
          <p className="mt-4 max-w-2xl text-ink-muted leading-relaxed">
            Diseñamos y construimos espacios a medida en {siteConfig.cities.length} ciudades de Colombia.
            Somos importadores de materias primas, distribuidores a través de una red de ferreterías
            y aliados del sector constructor. Todo eso al servicio de un solo objetivo: que tu hogar
            quede exactamente como lo imaginaste.
          </p>
          <p className="mt-4 max-w-2xl text-ink-muted leading-relaxed">
            No somos una idea nueva disfrazada de startup. Somos 30 años de oficio que decidieron
            dar el salto — con la tecnología, el diseño y la experiencia que este tiempo merece.
          </p>
        </div>
      </section>

      {/* Placeholder equipo / taller — OCULTO hasta tener fotos reales */}
      {false && (
      <section data-track-section="nosotros-team" className="border-b border-neutral-200 bg-paper-dim">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            El equipo
          </p>
          <h2 className="font-display mt-4 text-2xl font-semibold text-ink md:text-3xl">
            Personas reales detrás de cada proyecto.
          </h2>
          <p className="mt-3 text-ink-muted">
            Próximamente: fotos del equipo y el taller.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] border border-dashed border-neutral-300 bg-neutral-100 flex items-center justify-center">
                <p className="text-xs text-ink-muted">Foto por agregar</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA final */}
      <section data-track-section="nosotros-cta" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <h2 className="font-display max-w-xl text-3xl font-semibold text-ink md:text-4xl">
          ¿Quieres ver cómo quedaría tu espacio?
        </h2>
        <p className="mt-4 max-w-lg text-ink-muted leading-relaxed">
          Empieza con una cotización. Sin compromiso, sin visitas innecesarias.
          Solo cuéntanos qué tienes en mente.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/proyectos"
            className="inline-flex items-center justify-center border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
          >
            Cotizar mi proyecto
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="nosotros_page"
            className="inline-flex items-center justify-center border border-ink px-6 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
          >
            Hablar por WhatsApp
          </a>
        </div>
      </section>

    </div>
  );
}
