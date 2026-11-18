"use client";

import { useState } from "react";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";

/* ─── style keys ─────────────────────────────────────────── */
type StyleKey = "minimal" | "rustico" | "sofisticado" | "industrial" | "escandinavo" | "ecletico";

/* ─── quiz data ──────────────────────────────────────────── */
interface Option {
  label: string;
  sub: string;
  style: StyleKey;
}

interface Question {
  q: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    q: "¿Cómo quieres sentirte al llegar a casa?",
    options: [
      { label: "Tranquilo y despejado", sub: "Sin ruido visual, todo en su lugar", style: "minimal" },
      { label: "Abrigado y acogedor", sub: "Como si el espacio te diera la bienvenida", style: "rustico" },
      { label: "Elegante y sofisticado", sub: "Un ambiente que impresiona desde la entrada", style: "sofisticado" },
      { label: "Con carácter y contraste", sub: "Un espacio crudo, real, con personalidad", style: "industrial" },
      { label: "Ordenado y funcional", sub: "Todo tiene su lugar, nada sobra", style: "escandinavo" },
      { label: "Creativo y con personalidad", sub: "Cada rincón cuenta algo diferente", style: "ecletico" },
    ],
  },
  {
    q: "¿Qué no puede faltar en tu espacio?",
    options: [
      { label: "Superficies limpias", sub: "Sin adornos, sin excesos", style: "minimal" },
      { label: "Madera natural y plantas", sub: "Texturas orgánicas que respiran", style: "rustico" },
      { label: "Mármol o piedra de alta gama", sub: "Materiales que se notan", style: "sofisticado" },
      { label: "Metal y materiales en bruto", sub: "Estructura visible, sin disimulos", style: "industrial" },
      { label: "Almacenamiento inteligente", sub: "Funcionalidad que se ve bien", style: "escandinavo" },
      { label: "Piezas únicas con historia", sub: "Objetos que no se consiguen en cualquier lado", style: "ecletico" },
    ],
  },
  {
    q: "¿Qué paleta de colores te atrae más?",
    options: [
      { label: "Blanco, gris y negro puro", sub: "Contraste limpio y atemporal", style: "minimal" },
      { label: "Café, terracota y verde oliva", sub: "Tonos tierra que calientan", style: "rustico" },
      { label: "Grafito, dorado y crema", sub: "Drama controlado y lujo discreto", style: "sofisticado" },
      { label: "Negro, óxido y gris cemento", sub: "Paleta urbana con carácter", style: "industrial" },
      { label: "Blanco roto, beige y madera clara", sub: "Luz suave, sin saturación", style: "escandinavo" },
      { label: "Colores mixtos con acento vibrante", sub: "Sin miedo al color bien puesto", style: "ecletico" },
    ],
  },
  {
    q: "¿Qué tipo de madera te llama más?",
    options: [
      { label: "Lacada en blanco o gris", sub: "Sin veta visible, acabado liso y uniforme", style: "minimal" },
      { label: "Roble o cedro natural", sub: "Veta marcada, color cálido, auténtica", style: "rustico" },
      { label: "Nogal oscuro o wengué pulido", sub: "Madera premium con presencia propia", style: "sofisticado" },
      { label: "Madera envejecida o combinada con metal", sub: "Contraste duro, textura con historia", style: "industrial" },
      { label: "Abedul o pino claro, acabado mate", sub: "Liviana, neutra, sin protagonismo", style: "escandinavo" },
      { label: "Madera pintada o con acabados mixtos", sub: "La convención no manda aquí", style: "ecletico" },
    ],
  },
  {
    q: "¿Qué tipo de cocina te inspira?",
    options: [
      { label: "Todo blanco, sin tiradores", sub: "Encimera de cuarzo, líneas invisibles", style: "minimal" },
      { label: "Madera natural, fregadero de porcelana", sub: "Calidez campestre con alma propia", style: "rustico" },
      { label: "Muebles oscuros y encimera de mármol", sub: "Grifo dorado, detalles que elevan", style: "sofisticado" },
      { label: "Concreto y madera, estructura expuesta", sub: "Cocina que no pretende ocultar nada", style: "industrial" },
      { label: "Muebles claros, funcionalidad máxima", sub: "Sin excesos, cada centímetro aprovechado", style: "escandinavo" },
      { label: "Combinación de colores y tiradores llamativos", sub: "Cocina con personalidad visible", style: "ecletico" },
    ],
  },
  {
    q: "¿Qué textura domina tu espacio ideal?",
    options: [
      { label: "Lisa, pulida, uniforme", sub: "Superficies que reflejan sin interrupciones", style: "minimal" },
      { label: "Rugosa, natural, con imperfecciones", sub: "La textura como parte del diseño", style: "rustico" },
      { label: "Aterciopelada o brillante", sub: "Lujo táctil que se siente al pasar la mano", style: "sofisticado" },
      { label: "Áspera, oxidada, en bruto", sub: "La materia prima sin disfrazar", style: "industrial" },
      { label: "Suave, neutra, ligera", sub: "Agradable sin llamar la atención", style: "escandinavo" },
      { label: "Variada, tejida, artesanal", sub: "Cuanto más capas, mejor", style: "ecletico" },
    ],
  },
  {
    q: "¿Cuál frase te representa más?",
    options: [
      { label: "\"Menos es más\"", sub: "El vacío bien usado es diseño", style: "minimal" },
      { label: "\"El calor del hogar en cada rincón\"", sub: "Un espacio que abraza", style: "rustico" },
      { label: "\"Un ambiente que habla por sí solo\"", sub: "Elegancia sin esfuerzo aparente", style: "sofisticado" },
      { label: "\"Crudo, real, con carácter propio\"", sub: "Sin filtros, sin pretensiones", style: "industrial" },
      { label: "\"Todo tiene su lugar, nada estorba\"", sub: "El orden como forma de bienestar", style: "escandinavo" },
      { label: "\"Cada pieza cuenta una historia\"", sub: "La coherencia la pones tú", style: "ecletico" },
    ],
  },
  {
    q: "Cuando imaginas tu espacio soñado, lo primero que ves es...",
    options: [
      { label: "Líneas rectas, luz natural y espacio vacío", sub: "Geometría pura", style: "minimal" },
      { label: "Vigas de madera, texturas naturales y velas", sub: "Calidez en cada material", style: "rustico" },
      { label: "Iluminación dramática y muebles de autor", sub: "Cada detalle, calculado", style: "sofisticado" },
      { label: "Ladrillo expuesto y tuberías a la vista", sub: "Lo crudo como estética", style: "industrial" },
      { label: "Plantas, libros ordenados y luz difusa", sub: "Armonía funcional", style: "escandinavo" },
      { label: "Arte en las paredes y muebles únicos", sub: "El espacio como autorretrato", style: "ecletico" },
    ],
  },
];

/* ─── result definitions ─────────────────────────────────── */
interface StyleResult {
  name: string;
  tagline: string;
  description: string;
  materials: string;
}

const RESULTS: Record<StyleKey, StyleResult> = {
  minimal: {
    name: "Moderno Minimalista",
    tagline: "El espacio habla por lo que no tiene.",
    description:
      "Líneas limpias, superficies despejadas y una paleta neutra donde cada mueble es el protagonista. Para ti, el orden no es obligación — es estética. Tu hogar es calmo, intencional y atemporal.",
    materials:
      "MDF lacado en blanco o gris · encimeras de cuarzo o laminado mate · herrajes ocultos · sin tiradores.",
  },
  rustico: {
    name: "Rústico Cálido",
    tagline: "Un hogar que abraza desde que entras.",
    description:
      "Madera natural con veta visible, texturas orgánicas y colores tierra que hacen sentir que el espacio lleva años contigo — aunque sea nuevo. Buscas calidez real, no decorada.",
    materials:
      "Roble o cedro natural · acabados cepillados o barniz cálido · herrajes en bronce o negro mate · detalles artesanales.",
  },
  sofisticado: {
    name: "Contemporáneo Sofisticado",
    tagline: "Elegancia sin esfuerzo aparente.",
    description:
      "Tu hogar es una declaración. Materiales premium, contrastes controlados y detalles que se notan al segundo. Sofisticación que no grita — pero se siente en todo.",
    materials:
      "Nogal oscuro o wengué pulido · encimeras de mármol o porcelanato · herrajes dorados o negros · iluminación de acento.",
  },
  industrial: {
    name: "Industrial Urbano",
    tagline: "Lo crudo como forma de arte.",
    description:
      "Te gusta lo auténtico. La imperfección controlada, el metal con la madera, los materiales que muestran su origen. Un espacio con carácter que no pretende ser perfecto — y por eso lo es.",
    materials:
      "Madera envejecida o con barniz oscuro · combinaciones madera-metal · acabados mate o satinado · detalles en acero o hierro.",
  },
  escandinavo: {
    name: "Escandinavo Funcional",
    tagline: "La belleza está en lo que funciona.",
    description:
      "Espacios ordenados, luz natural aprovechada al máximo y muebles que resuelven sin estorbar. Para ti la funcionalidad y la estética no son opuestos — son la misma cosa.",
    materials:
      "Abedul o pino claro · lacado en blanco roto o beige · herrajes simples en acero o niquelado · formas limpias.",
  },
  ecletico: {
    name: "Ecléctico Artesanal",
    tagline: "Cada pieza cuenta algo diferente.",
    description:
      "Tu espacio es tan único como tú. Mezclas épocas, texturas y colores con una coherencia que solo tú entiendes. Cada pieza tiene una razón de ser — y se nota. El resultado: un hogar irrepetible.",
    materials:
      "Acabados pintados o laqueados en colores · combinación de materiales · piezas personalizadas · detalles únicos.",
  },
};

/* ─── helper ─────────────────────────────────────────────── */
function computeResult(answers: StyleKey[]): StyleKey {
  const counts: Record<StyleKey, number> = {
    minimal: 0, rustico: 0, sofisticado: 0, industrial: 0, escandinavo: 0, ecletico: 0,
  };
  for (const a of answers) counts[a]++;
  return (Object.entries(counts) as [StyleKey, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/* ─── component ──────────────────────────────────────────── */
export function StyleQuiz() {
  const [current, setCurrent] = useState(0); // 0-based question index
  const [answers, setAnswers] = useState<StyleKey[]>([]);
  const [selected, setSelected] = useState<StyleKey | null>(null);
  const [done, setDone] = useState(false);

  const total = QUESTIONS.length;
  const question = QUESTIONS[current];
  const result = done ? RESULTS[computeResult(answers)] : null;
  const resultKey = done ? computeResult(answers) : null;

  function pick(style: StyleKey) {
    if (current === 0 && answers.length === 0 && !selected) {
      track("quiz_start", {});
    }
    setSelected(style);
  }

  function next() {
    if (!selected) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (current + 1 >= total) {
      setDone(true);
      track("quiz_complete", { style: computeResult([...answers, selected]) });
    } else {
      setCurrent(current + 1);
    }
  }

  function reset() {
    setCurrent(0);
    setAnswers([]);
    setSelected(null);
    setDone(false);
  }

  const wa = result
    ? getWhatsAppHref(
        `Hola Hechomadera, hice el quiz de estilo y mi resultado fue "${result.name}". Quiero cotizar un proyecto con esa línea estética.`,
      )
    : "";

  /* ── result screen ── */
  if (done && result && resultKey) {
    return (
      <div className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-ink px-6 py-5 text-paper">
          <p className="text-xs font-semibold uppercase tracking-widest text-paper/60">Tu estilo</p>
          <h3 className="mt-1 font-display text-2xl font-semibold">{result.name}</h3>
          <p className="mt-1 text-sm text-paper/70">{result.tagline}</p>
        </div>

        <div className="px-6 py-8">
          <p className="text-sm text-ink-muted leading-relaxed">{result.description}</p>

          <div className="mt-6 border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Materiales y acabados recomendados
            </p>
            <p className="mt-2 text-sm text-ink">{result.materials}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              data-track-location="quiz_result"
              className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-neutral-800"
            >
              Cotizar con este estilo
            </a>
            <a
              href="/contacto"
              className="inline-flex items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-ink hover:border-ink"
            >
              Hablar con un asesor
            </a>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-5 text-xs text-ink-muted underline hover:text-ink"
          >
            Volver a hacer el quiz
          </button>
        </div>
      </div>
    );
  }

  /* ── question screen ── */
  return (
    <div className="border border-neutral-200 bg-white">
      {/* header */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Pregunta {current + 1} de {total}
          </p>
          <p className="text-xs text-ink-muted">{Math.round(((current) / total) * 100)}% completado</p>
        </div>
        {/* progress bar */}
        <div className="mt-2 h-0.5 bg-neutral-200">
          <div
            className="h-0.5 bg-ink transition-all duration-500"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-6 py-8">
        <h3 className="font-display text-xl font-semibold text-ink">{question.q}</h3>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.options.map((opt) => (
            <button
              key={opt.style}
              type="button"
              onClick={() => pick(opt.style)}
              className={`w-full border p-4 text-left transition-colors ${
                selected === opt.style
                  ? "border-ink bg-ink text-paper"
                  : "border-neutral-200 bg-white text-ink hover:border-neutral-400"
              }`}
            >
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  selected === opt.style ? "text-paper/70" : "text-ink-muted"
                }`}
              >
                {opt.sub}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          {current > 0 ? (
            <button
              type="button"
              onClick={() => {
                setCurrent(current - 1);
                setAnswers(answers.slice(0, -1));
                setSelected(answers[current - 1] ?? null);
              }}
              className="border border-neutral-300 px-5 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              Atrás
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!selected}
            onClick={next}
            className="border border-ink bg-ink px-6 py-2 text-sm font-medium text-paper hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {current + 1 === total ? "Ver mi estilo" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
