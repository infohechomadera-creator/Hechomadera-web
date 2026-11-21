/**
 * Configuración central Hechomadera (Colombia).
 * Objetivos: conversión (agenda, compra, WhatsApp, formularios), UX premium, móvil primero.
 * Tipografía/colores: ajustar aquí o vía Tailwind theme (prompt → código).
 */
export const siteConfig = {
  name: "Hechomadera",
  tagline: "Diseño y construcción de tu hogar — a medida, con proceso claro.",
  locale: "es-CO" as const,
  /** Ciudades con cobertura inicial (según brief) */
  cities: [
    "Santa Marta",
    "Barranquilla",
    "Bogotá",
    "Cali",
    "Medellín",
    "Valledupar",
    "Cartagena",
    "Montería",
    "Sincelejo",
    "Ciénaga",
  ],
  /** Modelo: marketplace (pago 100% online) vs proyectos (desde + abono 35% configurable) */
  business: {
    marketplaceShippingNote:
      "Envío no incluido en productos estándar (se cotiza por ciudad).",
    projectShippingNote: "En proyectos a medida el envío va incluido según alcance acordado.",
    depositPercentDefault: 35,
  },
} as const;

export const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/tienda", label: "Tienda" },
  { href: "/proyectos", label: "Proyectos a medida" },
  { href: "/inspiracion", label: "Inspiración" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
] as const;
