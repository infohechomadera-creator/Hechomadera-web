"use client";

import { useState } from "react";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";

/* ─── types ─────────────────────────────────────────────── */
type SpaceKey = "cocina" | "closet" | "bano" | "sala" | "estudio" | "multiple";
type SizeKey = "pequeno" | "mediano" | "grande";
type TierKey = "economico" | "estandar" | "premium";

interface Range {
  min: number;
  max: number;
}

/* ─── price matrix (COP) ─────────────────────────────────── */
const BASE_RANGES: Record<SpaceKey, Record<TierKey, Range>> = {
  cocina: {
    economico: { min: 4_000_000, max: 9_000_000 },
    estandar: { min: 9_000_000, max: 18_000_000 },
    premium: { min: 18_000_000, max: 35_000_000 },
  },
  closet: {
    economico: { min: 2_000_000, max: 5_000_000 },
    estandar: { min: 5_000_000, max: 10_000_000 },
    premium: { min: 10_000_000, max: 22_000_000 },
  },
  bano: {
    economico: { min: 3_000_000, max: 7_000_000 },
    estandar: { min: 6_000_000, max: 12_000_000 },
    premium: { min: 12_000_000, max: 25_000_000 },
  },
  sala: {
    economico: { min: 4_000_000, max: 8_000_000 },
    estandar: { min: 8_000_000, max: 16_000_000 },
    premium: { min: 15_000_000, max: 30_000_000 },
  },
  estudio: {
    economico: { min: 3_000_000, max: 6_000_000 },
    estandar: { min: 5_000_000, max: 12_000_000 },
    premium: { min: 10_000_000, max: 22_000_000 },
  },
  multiple: {
    economico: { min: 8_000_000, max: 18_000_000 },
    estandar: { min: 15_000_000, max: 35_000_000 },
    premium: { min: 30_000_000, max: 70_000_000 },
  },
};

const SIZE_MULTIPLIER: Record<SizeKey, number> = {
  pequeno: 0.75,
  mediano: 1.0,
  grande: 1.5,
};

/* ─── option definitions ─────────────────────────────────── */
const SPACES: { key: SpaceKey; label: string; desc: string }[] = [
  { key: "cocina", label: "Cocina", desc: "Muebles altos, bajos, isla" },
  { key: "closet", label: "Closet / Vestier", desc: "Alcobas y vestidores" },
  { key: "bano", label: "Baño", desc: "Vanitory, muebles de baño" },
  { key: "sala", label: "Sala / Comedor", desc: "Libreros, buffets, TV" },
  { key: "estudio", label: "Estudio / Oficina", desc: "Escritorios, archivadores" },
  { key: "multiple", label: "Varios espacios", desc: "Proyecto integral de hogar" },
];

const SIZES: { key: SizeKey; label: string; desc: string }[] = [
  { key: "pequeno", label: "Pequeño", desc: "Hasta 8 m²" },
  { key: "mediano", label: "Mediano", desc: "8 – 16 m²" },
  { key: "grande", label: "Grande", desc: "Más de 16 m²" },
];

const TIERS: { key: TierKey; label: string; desc: string }[] = [
  { key: "economico", label: "Económico", desc: "Aglomerado funcional, herrajes estándar" },
  { key: "estandar", label: "Estándar", desc: "MDF lacado o melamínico, herrajes de calidad" },
  { key: "premium", label: "Premium", desc: "Madera sólida, herrajes Blum, acabados de lujo" },
];

/* ─── helpers ────────────────────────────────────────────── */
function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function computeRange(space: SpaceKey, size: SizeKey, tier: TierKey): Range {
  const base = BASE_RANGES[space][tier];
  const mult = SIZE_MULTIPLIER[size];
  return {
    min: Math.round((base.min * mult) / 100_000) * 100_000,
    max: Math.round((base.max * mult) / 100_000) * 100_000,
  };
}

/* ─── sub-components ─────────────────────────────────────── */
function OptionCard({
  label,
  desc,
  selected,
  onClick,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-card border px-5 py-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        selected
          ? "border-ink bg-ink text-snow"
          : "border-cloud bg-snow text-ink hover:border-mist hover:bg-paper-dim"
      }`}
    >
      <span className="block text-[15px] font-semibold">{label}</span>
      <span className={`mt-0.5 block text-sm ${selected ? "text-ash" : "text-ink-muted"}`}>{desc}</span>
    </button>
  );
}

function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="mb-6">
      <p className="eyebrow">
        Paso {step} de {total}
      </p>
      <h3 className="titulo-tarjeta mt-1 text-balance">{title}</h3>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-paper">
        <div
          className="h-1.5 rounded-full bg-ink transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export function ProjectEstimator() {
  const [step, setStep] = useState(1);
  const [space, setSpace] = useState<SpaceKey | null>(null);
  const [size, setSize] = useState<SizeKey | null>(null);
  const [tier, setTier] = useState<TierKey | null>(null);

  const spaceLabel = SPACES.find((s) => s.key === space)?.label ?? "";
  const sizeLabel = SIZES.find((s) => s.key === size)?.label ?? "";
  const tierLabel = TIERS.find((t) => t.key === tier)?.label ?? "";

  const result =
    space && size && tier ? computeRange(space, size, tier) : null;

  const waMessage =
    result
      ? `Hola Hechomadera, hice el estimador y me salió un rango de ${fmt(result.min)} – ${fmt(result.max)} para una ${spaceLabel} ${sizeLabel.toLowerCase()} con acabado ${tierLabel.toLowerCase()}. Quiero cotizar formalmente.`
      : "Hola Hechomadera, quiero cotizar un proyecto a medida.";

  const wa = getWhatsAppHref(waMessage);

  function reset() {
    setStep(1);
    setSpace(null);
    setSize(null);
    setTier(null);
  }

  return (
    <div>
      {/* header bar */}
      <div className="tarjeta-suave px-5 py-4">
        <p className="eyebrow">
          Estimador de proyecto
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">
          Orientativo — la cotización formal la define el valor real.
        </p>
      </div>

      <div className="pt-7">
        {/* ── Step 1: Space ── */}
        {step === 1 && (
          <>
            <StepHeader step={1} total={3} title="¿Qué espacio quieres transformar?" />
            <div className="grid gap-3 sm:grid-cols-2">
              {SPACES.map((s) => (
                <OptionCard
                  key={s.key}
                  label={s.label}
                  desc={s.desc}
                  selected={space === s.key}
                  onClick={() => {
                    if (!space) track("estimator_start", {});
                    setSpace(s.key);
                  }}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!space}
                onClick={() => setStep(2)}
                className="boton-primario disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-obsidian"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Size ── */}
        {step === 2 && (
          <>
            <StepHeader step={2} total={3} title="¿De qué tamaño es el espacio?" />
            <div className="grid gap-3 sm:grid-cols-3">
              {SIZES.map((s) => (
                <OptionCard
                  key={s.key}
                  label={s.label}
                  desc={s.desc}
                  selected={size === s.key}
                  onClick={() => setSize(s.key)}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="boton-borde"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={!size}
                onClick={() => setStep(3)}
                className="boton-primario disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-obsidian"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Tier ── */}
        {step === 3 && (
          <>
            <StepHeader step={3} total={3} title="¿Qué nivel de acabado buscas?" />
            <div className="grid gap-3">
              {TIERS.map((t) => (
                <OptionCard
                  key={t.key}
                  label={t.label}
                  desc={t.desc}
                  selected={tier === t.key}
                  onClick={() => setTier(t.key)}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="boton-borde"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={!tier}
                onClick={() => {
                  setStep(4);
                  if (space && size && tier) {
                    track("estimator_complete", { space, size, tier });
                  }
                }}
                className="boton-primario disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-obsidian"
              >
                Ver estimado
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Result ── */}
        {step === 4 && result && (
          <>
            <div className="mb-6">
              <p className="etiqueta-ember">
                Tu estimado
              </p>
              <div className="mt-4 h-1.5 rounded-full bg-ink" />
            </div>

            {/* summary chips */}
            <div className="mb-6 flex flex-wrap gap-2">
              {[spaceLabel, sizeLabel, tierLabel].map((tag) => (
                <span
                  key={tag}
                  className="etiqueta bg-snow"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* result block */}
            <div className="bloque-oscuro p-6 sm:p-7">
              <p className="eyebrow text-ash">
                Rango estimado del proyecto
              </p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-snow sm:text-heading-sm sm:leading-tight">
                {fmt(result.min)} – {fmt(result.max)}
              </p>
              <p className="mt-3 text-caption text-ash">
                Valores orientativos en pesos colombianos. El precio final sale de la cotización formal
                según medidas, diseño y materiales exactos.
              </p>
            </div>

            {/* deposit calc inline */}
            <div className="tarjeta-suave mt-3 px-6 py-5">
              <p className="text-sm text-ink-muted">
                Abono inicial estimado{" "}
                <strong className="text-ink">(35%)</strong>:{" "}
                <span className="font-semibold text-ink">
                  {fmt(Math.round(result.min * 0.35))} – {fmt(Math.round(result.max * 0.35))}
                </span>
              </p>
              <p className="mt-1 text-caption text-ink-soft">
                El saldo se acuerda en cotización. Puedes pagar el abono 100% online.
              </p>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="estimator_result"
                className="boton-primario"
              >
                Cotizar por WhatsApp
              </a>
              <a
                href="/contacto"
                className="boton-borde"
              >
                Formulario de contacto
              </a>
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-5 text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              Volver a calcular
            </button>
          </>
        )}
      </div>
    </div>
  );
}
