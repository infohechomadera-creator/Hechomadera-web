import { siteConfig } from "@/lib/site-config";

/**
 * Datos estructurados Organization (schema.org) — SEO.
 * Mejora la visibilidad en búsquedas locales y de marca.
 * URL base desde NEXT_PUBLIC_SITE_URL.
 */
export function JsonLdOrganization() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE
    ? `+${process.env.NEXT_PUBLIC_WHATSAPP_PHONE.replace(/\D/g, "")}`
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    description:
      "Carpintería digital que diseña y construye espacios a medida en Colombia. Proceso 100% digital, precios transparentes y 30 años de oficio.",
    url: base,
    logo: `${base}/og-image.jpg`,
    ...(phone && { telephone: phone }),
    sameAs: [
      "https://www.instagram.com/hechomadera/",
    ],
    areaServed: siteConfig.cities.map((city) => ({
      "@type": "City",
      name: city,
    })),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Spanish",
      ...(phone && { telephone: phone }),
      contactOption: "TollFree",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
