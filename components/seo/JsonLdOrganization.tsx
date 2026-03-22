import { siteConfig } from "@/lib/site-config";

/**
 * Datos estructurados Organization (SEO). URL base desde NEXT_PUBLIC_SITE_URL.
 */
export function JsonLdOrganization() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    description: siteConfig.tagline,
    url: base,
    areaServed: {
      "@type": "Country",
      name: "Colombia",
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
