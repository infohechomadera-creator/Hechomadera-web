import type { Metadata } from "next";
import Link from "next/link";
import { ProjectEstimator } from "@/components/business/ProjectEstimator";
import { StyleQuiz } from "@/components/business/StyleQuiz";
import { PdfDownloadButton } from "@/components/business/PdfDownloadButton";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Proyectos a Medida — Cocinas Integrales, Closets y Remodelación en Colombia",
  description:
    "Fábrica de cocinas integrales, closets, vestidores y carpintería arquitectónica. Diseño, renders, fabricación e instalación a medida. Carpinteros y ebanistas en Bogotá, Medellín, Cali, Barranquilla, Santa Marta y más.",
};

/* ─── Timeline data ──────────────────────────────────────── */
const phases = [
  {
    num: "01",
    title: "Contacto y referencias",
    time: "Día 1",
    tasks: [
      "Nos cuentas tu visión y el espacio",
      "Envías medidas aproximadas o fotos",
      "Solicitás visita técnica si lo preferís",
    ],
    note: "WhatsApp o formulario — respuesta en menos de 15 min.",
  },
  {
    num: "02",
    title: "Cotización y diseño",
    time: "Días 2 – 5",
    tasks: [
      "Propuesta con precio desde",
      "Renders e imágenes de referencia",
      "Ajuste de materiales y alcance",
    ],
    note: "Sin compromiso hasta confirmar.",
  },
  {
    num: "03",
    title: "Abono y confirmación",
    time: "Día 5 – 7",
    tasks: [
      "Abono inicial del 35% por web (Mercado Pago)",
      "Visita técnica para medidas exactas si aplica",
      "Validación final de diseño",
    ],
    note: "Pago 100% seguro, confirmación inmediata por email.",
  },
  {
    num: "04",
    title: "Fabricación",
    time: "Semanas 2 – 5",
    tasks: [
      "Producción en taller con seguimiento",
      "Actualización de estado del proyecto",
      "Control de calidad antes de despacho",
    ],
    note: "Tiempos según complejidad y ciudad.",
  },
  {
    num: "05",
    title: "Instalación y entrega",
    time: "Semana 5 – 7",
    tasks: [
      "Entrega e instalación coordinada",
      "Revisión final contigo",
      "Saldo y cierre del proyecto",
    ],
    note: "Garantía sobre mano de obra e instalación.",
  },
];

/* ─── What's included ────────────────────────────────────── */
const included = [
  { label: "Diseño y renders", desc: "Visualizás el resultado antes de fabricar." },
  { label: "Medición técnica", desc: "Visita de ajuste incluida en la mayoría de proyectos." },
  { label: "Fabricación", desc: "En taller propio con materiales acordados." },
  { label: "Instalación", desc: "Incluida según alcance del proyecto." },
  { label: "Seguimiento", desc: "Un asesor disponible durante todo el proceso." },
  { label: "Garantía", desc: "Sobre mano de obra e instalación." },
];

export default function ProyectosPage() {
  return (
    <div className="contenedor pb-14 md:pb-20">

      {/* ── Hero ────────────────────────────────────────────── */}
      <section data-track-section="proyectos-hero" className="pt-14 md:pt-20">
        <h1 className="titulo-display max-w-4xl text-balance">
          Tu espacio, diseñado<br className="hidden sm:block" /> antes de fabricar.
        </h1>
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-2xl text-body-lg text-ink-muted">
            Proceso 100% digital: cotización clara, renders para que veas el resultado antes de comprometerte,
            abono del <strong className="font-semibold text-ink">{siteConfig.business.depositPercentDefault}% online</strong> y seguimiento en cada
            etapa. Sin sorpresas.
          </p>
          <div className="flex flex-wrap gap-3 lg:shrink-0">
            <a
              href="https://wa.me/573012890552?text=Hola%20Hechomadera%2C%20quiero%20cotizar%20un%20proyecto%20a%20medida."
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="proyectos_hero"
              className="boton-primario w-full sm:w-auto"
            >
              Solicitar cotización
            </a>
            <Link href="/contacto" className="boton-neutro w-full sm:w-auto">
              Formulario de contacto
            </Link>
          </div>
        </div>
      </section>

      {/* ── What's included ─────────────────────────────────── */}
      <section data-track-section="proyectos-incluido" className="pt-14 md:pt-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
          <h2 className="titulo-seccion text-balance lg:col-span-4">Todo incluido en el proceso</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
            {included.map((item) => (
              <li key={item.label} className="tarjeta flex items-start gap-4 p-6">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-base font-medium text-snow"
                >
                  +
                </span>
                <div className="pt-0.5">
                  <span className="block text-base font-semibold text-ink">{item.label}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <section data-track-section="proyectos-timeline" className="pt-14 md:pt-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-8">
          <h2 className="titulo-seccion text-balance">Cómo avanza tu proyecto</h2>
          <p className="text-body text-ink-muted">Cinco fases, un asesor de principio a fin.</p>
        </div>

        {/* mobile: vertical stack | desktop: horizontal */}
        <div className="mt-8 md:mt-10">
          {/* Desktop connector line */}
          <div className="hidden lg:flex lg:items-start lg:gap-0">
            {phases.map((phase, i) => (
              <div key={phase.num} className="relative flex-1">
                {/* connector */}
                {i < phases.length - 1 && (
                  <div className="absolute left-1/2 top-5 h-px w-full bg-mist" />
                )}
                <div className="relative flex flex-col items-center px-3 text-center">
                  {/* circle */}
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold tabular-nums text-snow ring-4 ring-paper">
                    {phase.num}
                  </div>
                  <p className="eyebrow mt-4">
                    {phase.time}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-ink">{phase.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Phase detail cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:mt-6 lg:grid-cols-5">
            {phases.map((phase) => (
              <div
                key={phase.num}
                className="tarjeta flex flex-col p-6"
              >
                {/* mobile: show number + time inline */}
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold tabular-nums text-snow">
                    {phase.num}
                  </div>
                  <div>
                    <p className="eyebrow">
                      {phase.time}
                    </p>
                    <p className="text-base font-semibold text-ink">{phase.title}</p>
                  </div>
                </div>

                {/* tasks */}
                <ul className="mt-5 flex-1 space-y-2 lg:mt-0">
                  {phase.tasks.map((task) => (
                    <li key={task} className="flex items-start gap-2 text-sm text-ink-muted">
                      <span className="shrink-0 text-ash">&#8212;</span>
                      {task}
                    </li>
                  ))}
                </ul>

                {/* note */}
                <p className="mt-5 border-t border-cloud pt-4 text-caption text-ink-soft">
                  {phase.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Herramientas: estimador y quiz ───────────────────── */}
      <section className="grid items-start gap-3 pt-14 md:pt-20 lg:grid-cols-2 lg:gap-4">
        {/* ── Project Estimator ────────────────────────────────── */}
        <div data-track-section="proyectos-estimador">
          <CollapsibleSection
            title="¿Cuánto puede costar tu proyecto?"
            description="Estimador orientativo en 3 pasos — espacio, tamaño y acabado."
          >
            <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
              <ProjectEstimator />
            </div>
          </CollapsibleSection>
        </div>

        {/* ── Style Quiz ───────────────────────────────────────── */}
        <div data-track-section="proyectos-quiz">
          <CollapsibleSection
            title="¿Cuál es tu estilo?"
            description="8 preguntas para descubrir la línea estética de tu proyecto."
          >
            <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
              <StyleQuiz />
            </div>
          </CollapsibleSection>
        </div>
      </section>

      {/* ── PDF Guide ────────────────────────────────────────── */}
      <section data-track-section="proyectos-guia" className="pt-14 md:pt-20">
        <div className="tarjeta flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between md:p-10">
          <div>
            <h2 className="titulo-tarjeta text-balance md:text-heading-sm md:leading-tight">
              Guía de medidas para tu proyecto
            </h2>
            <p className="mt-3 max-w-md text-body text-ink-muted">
              Antes de la visita técnica podés tomar medidas básicas tú mismo. Descargá la guía
              paso a paso — es gratis y te ahorra tiempo.
            </p>
          </div>
          <PdfDownloadButton />
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section data-track-section="proyectos-cta" className="pt-14 md:pt-20">
        <div className="bloque-oscuro px-6 py-14 text-center md:px-12 md:py-20">
          <h2 className="titulo-seccion mx-auto max-w-2xl text-balance text-snow">
            Tu proyecto empieza con una conversación.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-ash">
            Cuéntanos qué tienes en mente — sin compromiso, sin costos ocultos.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="https://wa.me/573012890552?text=Hola%20Hechomadera%2C%20quiero%20cotizar%20un%20proyecto%20a%20medida."
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="proyectos_cta_final"
              className="boton-claro"
            >
              WhatsApp — respuesta en 15 min
            </a>
            <Link
              href="/contacto"
              className="boton border border-iron text-snow hover:border-steel hover:bg-slate"
            >
              Enviar formulario
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
