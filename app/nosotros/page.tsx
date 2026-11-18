import type { Metadata } from "next";
import Link from "next/link";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Nosotros — Ebanistería y Carpintería Arquitectónica con 30 Años de Oficio",
  description:
    "La carpintería con 30 años de experiencia en Colombia. Fabricamos cocinas integrales, closets modernos, muebles de madera y carpintería arquitectónica a medida. Ebanistería real, proceso digital, presencia en 10 ciudades.",
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
      <section data-track-section="nosotros-why" className="seccion">
        <div className="contenedor">
          <p className="eyebrow">
            Por qué existimos
          </p>
          <h1 className="titulo-display mt-4 max-w-4xl text-balance">
            Creemos que remodelar tu hogar debería sentirse como un sueño, no sobrevivirse como una pesadilla.
          </h1>
          <p className="mt-6 max-w-2xl text-body-lg text-ink-muted">
            Existe un problema real: la informalidad convirtió algo tan personal como tu espacio en
            una fuente de estrés. Citas que no llegan, presupuestos que cambian, obras que no terminan.
            Hechomadera nació para cambiar eso — y para devolverte el placer de construir el hogar que imaginaste.
          </p>
        </div>
      </section>

      {/* HOW — cómo lo hacemos */}
      <section data-track-section="nosotros-how" className="pb-14 md:pb-20">
        <div className="contenedor">
          <div className="tarjeta p-7 md:p-12">
            <p className="eyebrow">
              Cómo lo hacemos
            </p>
            <h2 className="titulo-seccion mt-4 max-w-2xl text-balance">
              La carpintería que ya conoces, reinventada para este siglo.
            </h2>
            <p className="mt-4 max-w-2xl text-ink-muted">
              Unimos tres décadas de oficio artesanal con diseño de interiores, herramientas digitales
              e inteligencia artificial. El resultado: un proceso sin fricciones donde tú ves, apruebas
              y confías antes de que empiece la obra.
            </p>

            <ul className="mt-10 grid gap-3 md:grid-cols-3">
              {pillars.map((p) => (
                <li key={p.title} className="tarjeta-suave p-7">
                  <h3 className="titulo-tarjeta">{p.title}</h3>
                  <p className="mt-3 text-sm text-ink-muted">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section data-track-section="nosotros-stats" className="pb-14 md:pb-20">
        <div className="contenedor">
          <ul className="bloque-oscuro grid gap-10 px-7 py-12 sm:grid-cols-3 md:px-12">
            {stats.map((s) => (
              <li key={s.label} className="text-center sm:text-left">
                <p className="font-display text-heading-lg font-semibold tracking-[-0.02em] text-snow md:text-display">{s.value}</p>
                <p className="mt-2 text-caption uppercase tracking-[0.08em] text-ash">{s.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHAT — quiénes somos */}
      <section data-track-section="nosotros-what" className="pb-14 md:pb-20">
        <div className="contenedor grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">
              Qué somos
            </p>
            <h2 className="titulo-seccion mt-4 max-w-xl text-balance">
              Una carpintería digital con presencia en todo el país.
            </h2>
          </div>
          <div className="tarjeta p-7 md:p-9">
            <p className="text-ink-muted">
              Diseñamos y construimos espacios a medida en {siteConfig.cities.length} ciudades de Colombia.
              Somos importadores de materias primas, distribuidores a través de una red de ferreterías
              y aliados del sector constructor. Todo eso al servicio de un solo objetivo: que tu hogar
              quede exactamente como lo imaginaste.
            </p>
            <p className="mt-4 text-ink-muted">
              No somos una idea nueva disfrazada de startup. Somos 30 años de oficio que decidieron
              dar el salto — con la tecnología, el diseño y la experiencia que este tiempo merece.
            </p>
          </div>
        </div>
      </section>

      {/* Placeholder equipo / taller — OCULTO hasta tener fotos reales */}
      {false && (
      <section data-track-section="nosotros-team" className="pb-14 md:pb-20">
        <div className="contenedor">
          <p className="eyebrow">
            El equipo
          </p>
          <h2 className="titulo-seccion mt-4">
            Personas reales detrás de cada proyecto.
          </h2>
          <p className="mt-3 text-ink-muted">
            Próximamente: fotos del equipo y el taller.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tarjeta-suave flex aspect-[4/3] items-center justify-center border-dashed border-mist">
                <p className="text-caption text-ink-muted">Foto por agregar</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA final */}
      <section data-track-section="nosotros-cta" className="contenedor pb-14 md:pb-20">
        <div className="bloque-oscuro flex flex-col gap-8 px-7 py-12 md:px-12 md:py-16 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display max-w-xl text-balance text-heading-sm font-semibold tracking-[-0.015em] text-snow md:text-heading">
              ¿Quieres ver cómo quedaría tu espacio?
            </h2>
            <p className="mt-4 max-w-lg text-ash">
              Empieza con una cotización. Sin compromiso, sin visitas innecesarias.
              Solo cuéntanos qué tienes en mente.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/proyectos"
              className="boton-claro focus-visible:outline-snow"
            >
              Cotizar mi proyecto
            </Link>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="nosotros_page"
              className="boton border border-steel text-snow hover:bg-slate focus-visible:outline-snow"
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
