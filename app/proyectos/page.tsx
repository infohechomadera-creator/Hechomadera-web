import type { Metadata } from "next";
import Link from "next/link";
import { ProjectEstimator } from "@/components/business/ProjectEstimator";
import { StyleQuiz } from "@/components/business/StyleQuiz";
import { PdfDownloadButton } from "@/components/business/PdfDownloadButton";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Proyectos a Medida — Carpintería Arquitectónica y Remodelación",
  description:
    "Carpintería arquitectónica a medida: cocinas, closets, muebles de madera y remodelación con diseño, renders y proceso claro. Carpinteros en Bogotá, Medellín, Cali, Barranquilla y más ciudades de Colombia.",
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
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div data-track-section="proyectos-hero" className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl lg:text-5xl">
          Tu espacio, diseñado<br className="hidden sm:block" /> antes de fabricar.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-ink-muted">
          Proceso 100% digital: cotización clara, renders para que veas el resultado antes de comprometerte,
          abono del <strong>{siteConfig.business.depositPercentDefault}% online</strong> y seguimiento en cada
          etapa. Sin sorpresas.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://wa.me/573012890552?text=Hola%20Hechomadera%2C%20quiero%20cotizar%20un%20proyecto%20a%20medida."
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="proyectos_hero"
            className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
          >
            Solicitar cotización
          </a>
          <Link
            href="/contacto"
            className="inline-flex items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-ink hover:border-ink"
          >
            Formulario de contacto
          </Link>
        </div>
      </div>

      {/* ── What's included ─────────────────────────────────── */}
      <div data-track-section="proyectos-incluido" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className="font-display text-xl font-semibold text-ink">Todo incluido en el proceso</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {included.map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-ink text-xs font-bold text-ink">
                +
              </span>
              <div>
                <span className="block text-sm font-semibold text-ink">{item.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{item.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <div data-track-section="proyectos-timeline" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className="font-display text-xl font-semibold text-ink">Cómo avanza tu proyecto</h2>
        <p className="mt-2 text-sm text-ink-muted">Cinco fases, un asesor de principio a fin.</p>

        {/* mobile: vertical stack | desktop: horizontal */}
        <div className="mt-8">
          {/* Desktop connector line */}
          <div className="hidden lg:flex lg:items-start lg:gap-0">
            {phases.map((phase, i) => (
              <div key={phase.num} className="relative flex-1">
                {/* connector */}
                {i < phases.length - 1 && (
                  <div className="absolute left-1/2 top-5 h-0.5 w-full bg-neutral-200" />
                )}
                <div className="relative flex flex-col items-center px-3 text-center">
                  {/* circle */}
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center border-2 border-ink bg-ink font-mono text-sm font-bold text-paper">
                    {phase.num}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {phase.time}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{phase.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Phase detail cards */}
          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {phases.map((phase) => (
              <div
                key={phase.num}
                className="border border-neutral-200 bg-white p-5"
              >
                {/* mobile: show number + time inline */}
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink bg-ink font-mono text-xs font-bold text-paper">
                    {phase.num}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {phase.time}
                    </p>
                    <p className="text-sm font-semibold text-ink">{phase.title}</p>
                  </div>
                </div>

                {/* tasks */}
                <ul className="mt-4 space-y-1.5 lg:mt-2">
                  {phase.tasks.map((task) => (
                    <li key={task} className="flex items-start gap-2 text-xs text-ink-muted">
                      <span className="mt-0.5 shrink-0 text-ink">&#8212;</span>
                      {task}
                    </li>
                  ))}
                </ul>

                {/* note */}
                <p className="mt-4 border-t border-neutral-100 pt-3 text-xs italic text-ink-muted">
                  {phase.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Project Estimator ────────────────────────────────── */}
      <div data-track-section="proyectos-estimador" className="mt-16 border-t border-neutral-200 pt-12">
        <div className="max-w-2xl">
          <CollapsibleSection
            title="¿Cuánto puede costar tu proyecto?"
            description="Estimador orientativo en 3 pasos — espacio, tamaño y acabado."
          >
            <div className="p-6">
              <ProjectEstimator />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* ── Style Quiz ───────────────────────────────────────── */}
      <div data-track-section="proyectos-quiz" className="mt-8 max-w-2xl">
        <CollapsibleSection
          title="¿Cuál es tu estilo?"
          description="8 preguntas para descubrir la línea estética de tu proyecto."
        >
          <div className="p-6">
            <StyleQuiz />
          </div>
        </CollapsibleSection>
      </div>

      {/* ── PDF Guide ────────────────────────────────────────── */}
      <div data-track-section="proyectos-guia" className="mt-16 border-t border-neutral-200 pt-12">
        <div className="flex flex-col gap-6 border border-neutral-200 bg-paper-dim p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Guía de medidas para tu proyecto
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Antes de la visita técnica podés tomar medidas básicas tú mismo. Descargá la guía
              paso a paso — es gratis y te ahorra tiempo.
            </p>
          </div>
          <PdfDownloadButton />
        </div>
      </div>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <div data-track-section="proyectos-cta" className="mt-16 border-t border-neutral-200 pt-12">
        <div className="bg-ink px-8 py-12 text-center text-paper">
          <h2 className="font-display text-2xl font-semibold">
            Tu proyecto empieza con una conversación.
          </h2>
          <p className="mt-3 text-sm text-paper/70">
            Cuéntanos qué tienes en mente — sin compromiso, sin costos ocultos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/573012890552?text=Hola%20Hechomadera%2C%20quiero%20cotizar%20un%20proyecto%20a%20medida."
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="proyectos_cta_final"
              className="inline-flex items-center justify-center border border-paper bg-paper px-6 py-3 text-sm font-medium text-ink hover:bg-neutral-100"
            >
              WhatsApp — respuesta en 15 min
            </a>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center border border-paper/40 px-6 py-3 text-sm font-medium text-paper hover:border-paper"
            >
              Enviar formulario
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
