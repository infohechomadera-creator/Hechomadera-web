/**
 * Catálogo de cocinas (W2): 4 formas × 5 diseños base = 20 escenas.
 * PROVISIONAL: los nombres de los diseños son la propuesta del traspaso (§7)
 * y las imágenes son dibujos de referencia hasta tener los renders.
 */
import type { DisenoBase, Forma, MedidasAprox } from "@/lib/precios/tipos";

export interface InfoForma {
  id: Forma;
  nombre: string;
  descripcion: string;
  /** Medidas de referencia para mostrar el "desde" (cocina típica de apartamento). */
  referencia_mm: MedidasAprox;
}

export interface InfoDiseno {
  id: DisenoBase;
  nombre: string;
  descripcion: string;
  paleta: { frentes: string; encimera: string; acento: string };
}

export const FORMAS_COCINA: InfoForma[] = [
  {
    id: "lineal",
    nombre: "Lineal",
    descripcion: "Todo en una pared. Ideal para espacios angostos o cocinas abiertas pequeñas.",
    referencia_mm: { pared_a: 3000 },
  },
  {
    id: "L",
    nombre: "En L",
    descripcion: "Dos paredes en esquina. Más mesón y circulación cómoda.",
    referencia_mm: { pared_a: 3000, pared_b: 2400 },
  },
  {
    id: "U",
    nombre: "En U",
    descripcion: "Tres paredes. Máximo almacenamiento y todo a la mano.",
    referencia_mm: { pared_a: 3000, pared_b: 2400, pared_c: 2400 },
  },
  {
    id: "isla",
    nombre: "Con isla",
    descripcion: "Una pared más una isla al centro para cocinar, comer o reunirse.",
    referencia_mm: { pared_a: 3600, isla: 1800 },
  },
];

export const DISENOS_COCINA: InfoDiseno[] = [
  {
    id: "D1",
    nombre: "Moderno liso",
    descripcion: "Frentes lisos sin manijas, con perfil gola. Limpio y fácil de mantener.",
    paleta: { frentes: "#ebe7e0", encimera: "#2d2d2d", acento: "#111111" },
  },
  {
    id: "D2",
    nombre: "Clásico shaker",
    descripcion: "Puertas con marco, manijas metálicas y tonos suaves. Atemporal.",
    paleta: { frentes: "#7d8b7f", encimera: "#efeae2", acento: "#b08d57" },
  },
  {
    id: "D3",
    nombre: "Nórdico",
    descripcion: "Madera clara, blancos y luz. Cálido y sencillo.",
    paleta: { frentes: "#d9c19a", encimera: "#f5f2ec", acento: "#ffffff" },
  },
  {
    id: "D4",
    nombre: "Industrial",
    descripcion: "Tonos oscuros, concreto y detalles en madera. Carácter fuerte.",
    paleta: { frentes: "#3b3b3b", encimera: "#8d8c87", acento: "#9c5a2e" },
  },
  {
    id: "D5",
    nombre: "Minimalista mate",
    descripcion: "Acabado mate con madera nogal. Sobrio y elegante.",
    paleta: { frentes: "#c8c3ba", encimera: "#fbfbfa", acento: "#7a5233" },
  },
];

export interface Escena {
  id: string; // por ejemplo "L-D3"
  forma: InfoForma;
  diseno: InfoDiseno;
}

export const ESCENAS: Escena[] = FORMAS_COCINA.flatMap((forma) =>
  DISENOS_COCINA.map((diseno) => ({ id: `${forma.id}-${diseno.id}`, forma, diseno })),
);
