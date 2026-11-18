import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

/**
 * Sistema de diseño Hechomadera (2026-11-18), basado en docs/DISENO-REFERENCIA.md:
 * escala zinc casi monocromática, bordes finos en vez de sombras, esquinas
 * generosas (tarjetas 36px, botones 14px, etiquetas 12px) y un solo acento
 * naranja (ember) reservado para etiquetas destacadas.
 * Los nombres `ink` y `paper` se conservan para que todo el sitio herede la paleta.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#09090b", muted: "#52525b", soft: "#71717a" },
        paper: { DEFAULT: "#f4f4f5", dim: "#fafafa" },
        obsidian: "#09090b",
        graphite: "#18181b",
        slate: "#27272a",
        iron: "#3f3f46",
        steel: "#52525b",
        fog: "#71717a",
        ash: "#a1a1aa",
        mist: "#d4d4d8",
        cloud: "#ececee",
        snow: "#ffffff",
        ember: "#ff5a00",
        // Los grises "neutral" del sitio pasan a la escala zinc de la guía.
        neutral: { ...colors.zinc, 200: "#ececee" },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "1.64" }],
        body: ["15px", { lineHeight: "1.45" }],
        "body-lg": ["18px", { lineHeight: "1.45" }],
        subheading: ["20px", { lineHeight: "1.5" }],
        "heading-sm": ["32px", { lineHeight: "1.25" }],
        heading: ["40px", { lineHeight: "1.2" }],
        "heading-lg": ["56px", { lineHeight: "1.12" }],
        display: ["64px", { lineHeight: "1.08" }],
      },
      borderRadius: {
        badge: "12px",
        button: "14px",
        input: "14px",
        card: "36px",
        section: "48px",
      },
      boxShadow: {
        boton:
          "inset 0 0.5px 0 0 rgba(255,255,255,0.5), inset 0 9px 14px -5px rgba(117,123,133,0.4), 0 0 0 1.5px rgb(44,46,52), 0 4px 6px 0 rgba(0,0,0,0.14)",
        pill: "inset 0 1px 0 0 rgb(228,228,231)",
        suave: "0 4px 12px 0 rgba(0,0,0,0.04)",
      },
      maxWidth: { pagina: "1200px" },
    },
  },
  plugins: [],
};

export default config;
