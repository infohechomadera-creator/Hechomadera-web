import type { Forma } from "@/lib/precios/tipos";
import type { InfoDiseno } from "@/content/cocinas";

/**
 * Dibujo provisional (vista de planta) de una cocina según su forma y diseño.
 * Se reemplaza por el render real cuando exista.
 */
type Tramo = { x: number; y: number; w: number; h: number; vertical?: boolean };

const FONDO = 34;
const TRAMOS: Record<Forma, Tramo[]> = {
  lineal: [{ x: 50, y: 40, w: 300, h: FONDO }],
  L: [
    { x: 50, y: 40, w: 300, h: FONDO },
    { x: 50, y: 40 + FONDO, w: FONDO, h: 130 - FONDO, vertical: true },
  ],
  U: [
    { x: 50, y: 40, w: 300, h: FONDO },
    { x: 50, y: 40 + FONDO, w: FONDO, h: 130 - FONDO, vertical: true },
    { x: 350 - FONDO, y: 40 + FONDO, w: FONDO, h: 130 - FONDO, vertical: true },
  ],
  isla: [
    { x: 50, y: 40, w: 300, h: FONDO },
    { x: 120, y: 112, w: 160, h: 46 },
  ],
};

function divisiones(t: Tramo) {
  const paso = 38;
  const lineas = [];
  if (t.vertical) {
    for (let y = t.y + paso; y < t.y + t.h - 4; y += paso) lineas.push({ x1: t.x, y1: y, x2: t.x + t.w, y2: y });
  } else {
    for (let x = t.x + paso; x < t.x + t.w - 4; x += paso) lineas.push({ x1: x, y1: t.y, x2: x, y2: t.y + t.h });
  }
  return lineas;
}

export function EscenaCocina({
  forma,
  diseno,
  titulo,
}: {
  forma: Forma;
  diseno: InfoDiseno;
  titulo: string;
}) {
  const { frentes, encimera, acento } = diseno.paleta;
  const tramos = TRAMOS[forma];
  const principal = tramos[0];
  return (
    <svg viewBox="0 0 400 200" role="img" aria-label={titulo} className="h-full w-full">
      <title>{titulo}</title>
      {/* piso y muros */}
      <rect x="0" y="0" width="400" height="200" fill="#f4f4f5" />
      <path d="M40 30 H360 V190" fill="none" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="square" />
      <path d="M40 30 V190" fill="none" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="square" />
      {tramos.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={frentes} stroke="#1a1a1a" strokeWidth="1.2" />
          {/* mesón: franja contra el muro (en la isla, al centro) */}
          <rect
            x={t.vertical ? t.x + 2 : t.x + 2}
            y={t.vertical ? t.y : t.y + 2}
            width={t.vertical ? t.w * 0.45 : t.w - 4}
            height={t.vertical ? t.h : t.h * 0.45}
            fill={encimera}
            stroke="#1a1a1a"
            strokeWidth="0.6"
          />
          {divisiones(t).map((l, j) => (
            <line key={j} {...l} stroke={acento} strokeWidth="1" opacity="0.55" />
          ))}
        </g>
      ))}
      {/* lavaplatos y estufa sobre el tramo principal */}
      <rect
        x={principal.x + principal.w * 0.62}
        y={principal.y + 8}
        width="40"
        height={FONDO - 16}
        rx="4"
        fill="#d9dcdf"
        stroke="#1a1a1a"
        strokeWidth="1"
      />
      {[0, 1].map((c) =>
        [0, 1].map((f) => (
          <circle
            key={`${c}${f}`}
            cx={principal.x + principal.w * 0.22 + c * 18}
            cy={principal.y + 11 + f * 12}
            r="4.5"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1.2"
          />
        )),
      )}
      {forma === "isla" &&
        [0, 1, 2].map((i) => <circle key={i} cx={155 + i * 45} cy={172} r="8" fill={acento} opacity="0.8" />)}
    </svg>
  );
}
