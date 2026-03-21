import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Hechomadera: paleta base blanco + negro (ajustable por prompt) */
        ink: {
          DEFAULT: "#0a0a0a",
          muted: "#404040",
        },
        paper: {
          DEFAULT: "#fafafa",
          dim: "#f5f5f5",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-geist-sans)", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
