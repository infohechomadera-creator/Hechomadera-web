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
        /* Hechomadera: paleta 60-30-10 */
        ink: {
          DEFAULT: "#000f08",   /* 30% — texto, bordes, estructura */
          muted: "#4a524f",
        },
        paper: {
          DEFAULT: "#f7f7ff",   /* 60% — fondos y superficies */
          dim: "#eeeef6",
        },
        accent: {
          DEFAULT: "#fb3640",   /* 10% — CTA primario */
          hover: "#d42e37",
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
