import { siteConfig } from "@/lib/site-config";

const ALL_KEYWORDS = [
  "cocinas integrales","cocinas de madera","muebles de cocina","gabinetes de cocina",
  "cocina integral Bogotá","cocina integral Medellín","cocina integral Cali","cocina integral Barranquilla",
  "carpintería arquitectónica","carpintería","carpintero","carpinteros en Colombia",
  "carpinterías en Colombia","la carpintería","ebanistería","ebanista",
  "muebles de carpintería","muebles de madera","muebles a medida","muebles para hogar",
  "muebles de baño","closets","closets modernos","closets a medida","vestidores",
  "roperos","closet empotrado","remodelación","reformas","remodelación de cocinas",
  "madecentro","fabricación e instalación","carpintería para apartamentos",
  "muebles modulares","centros de entretenimiento","bibliotecas en madera",
  "mesones","diseño de interiores","renders de interiores","diseño a medida",
  "cocinas integrales Colombia","muebles de madera Colombia",
];

const SERVICES = [
  { name: "Cocinas Integrales a Medida", desc: "Diseño, fabricación e instalación de cocinas integrales en madera, MDF y materiales premium. Cocinas de madera, gabinetes, mesones y acabados a medida en Colombia." },
  { name: "Closets y Vestidores a Medida", desc: "Closets modernos, vestidores y roperos a medida con diseño personalizado. Carpintería arquitectónica para dormitorios en Colombia." },
  { name: "Muebles de Baño a Medida", desc: "Vanitorios, muebles de baño y ebanistería para baños a medida en madera y MDF lacado." },
  { name: "Carpintería Arquitectónica y Remodelación", desc: "Proyectos integrales de remodelación, carpintería arquitectónica, ebanistería y muebles de madera a medida en Colombia." },
  { name: "Muebles para Sala, Estudio y Comedor", desc: "Centros de entretenimiento, bibliotecas en madera, escritorios, buffets y muebles para sala y comedor a medida." },
];

export function JsonLdSite() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://hechomadera.com").replace(/\/$/, "");
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE
    ? `+${process.env.NEXT_PUBLIC_WHATSAPP_PHONE.replace(/\D/g, "")}`
    : "+573012890552";

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": `${base}/#organization`,
    name: "Hechomadera",
    alternateName: ["La Carpintería", "Hechomadera Carpintería", "Carpintería Hechomadera"],
    description:
      "Fábrica de cocinas integrales, closets, muebles de madera y carpintería arquitectónica a medida en Colombia. Ebanistería con 30 años de oficio, proceso digital, diseño con renders y fabricación en Bogotá, Medellín, Cali, Barranquilla, Santa Marta y más ciudades.",
    url: base,
    logo: `${base}/logo.png`,
    image: `${base}/og-image.jpg`,
    telephone: phone,
    priceRange: "$$",
    currenciesAccepted: "COP",
    paymentAccepted: "Mercado Pago, tarjeta de crédito, transferencia bancaria",
    foundingDate: "1994",
    numberOfEmployees: { "@type": "QuantitativeValue", value: "10" },
    address: {
      "@type": "PostalAddress",
      addressCountry: "CO",
      addressRegion: "Colombia",
    },
    areaServed: siteConfig.cities.map((city) => ({
      "@type": "City",
      name: city,
      containedInPlace: { "@type": "Country", name: "Colombia" },
    })),
    knowsAbout: ALL_KEYWORDS,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios de Carpintería y Muebles a Medida",
      itemListElement: SERVICES.map((s, i) => ({
        "@type": "OfferCatalog",
        position: i + 1,
        name: s.name,
        description: s.desc,
      })),
    },
    sameAs: [
      "https://www.instagram.com/hechomadera/",
      `https://wa.me/${phone.replace("+", "")}`,
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: phone,
        contactType: "sales",
        contactOption: "TollFree",
        availableLanguage: "Spanish",
        areaServed: "CO",
      },
      {
        "@type": "ContactPoint",
        telephone: phone,
        contactType: "customer service",
        availableLanguage: "Spanish",
        areaServed: "CO",
      },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: "Hechomadera",
    url: base,
    description: "Cocinas integrales, closets, muebles de madera y carpintería arquitectónica a medida en Colombia.",
    inLanguage: "es-CO",
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/tienda?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const serviceList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Servicios de Carpintería Hechomadera",
    description: "Cocinas integrales, closets, muebles de baño, carpintería arquitectónica y ebanistería a medida en Colombia.",
    itemListElement: SERVICES.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.name,
        description: s.desc,
        provider: { "@id": `${base}/#organization` },
        areaServed: { "@type": "Country", name: "Colombia" },
        url: base,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceList) }} />
    </>
  );
}
