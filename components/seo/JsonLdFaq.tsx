export function JsonLdFaq() {
  const faqs = [
    {
      q: "¿Cuánto cuesta una cocina integral en Colombia?",
      a: "El precio de una cocina integral en Colombia varía según el tamaño, materiales y acabados. En Hechomadera, las cocinas integrales en MDF lacado comienzan desde $9.000.000 COP para espacios medianos, y pueden llegar a $35.000.000 COP o más para cocinas premium en madera sólida con herrajes Blum. Usamos nuestro estimador online para darte un rango orientativo antes de la cotización formal.",
    },
    {
      q: "¿Hacen cocinas integrales en Bogotá, Medellín y Cali?",
      a: "Sí. Hechomadera fabrica e instala cocinas integrales, closets y muebles de madera a medida en Bogotá, Medellín, Cali, Barranquilla, Santa Marta, Cartagena, Valledupar, Montería, Sincelejo y Ciénaga. El proceso es 100% digital: cotizas, apruebas el diseño con renders y el equipo de carpinteros instala en tu ciudad.",
    },
    {
      q: "¿Cuál es la diferencia entre carpintería arquitectónica y carpintería regular?",
      a: "La carpintería arquitectónica integra los muebles al espacio desde el diseño: closets empotrados, cocinas integrales con medidas exactas, vestidores y muebles de baño que aprovechan cada centímetro. La carpintería regular fabrica muebles estándar sin adaptarse al espacio. En Hechomadera hacemos carpintería arquitectónica y ebanistería a medida.",
    },
    {
      q: "¿Qué materiales usan para cocinas integrales y closets?",
      a: "Trabajamos con MDF lacado, melamínico resistente a la humedad, madera sólida (roble, cedro, nogal) y materiales premium importados. Para herrajes usamos marcas como Blum. Los mesones pueden ser en cuarzo, mármol o laminado de alta presión. Todo se define en la cotización según tu presupuesto.",
    },
    {
      q: "¿Cuánto tiempo tarda fabricar un closet o una cocina integral a medida?",
      a: "El proceso completo — diseño, renders, visita técnica, fabricación e instalación — toma entre 5 y 7 semanas según la complejidad y la ciudad. Proyectos más pequeños como closets o muebles de baño pueden estar listos en 3 semanas. Un asesor te confirma los tiempos exactos en la cotización.",
    },
    {
      q: "¿Ofrecen servicio de diseño y renders antes de fabricar?",
      a: "Sí. Antes de fabricar cualquier cocina integral, closet o proyecto de carpintería arquitectónica, diseñamos tu espacio con renders e inteligencia artificial para que veas el resultado exacto. Solo aprobamos la fabricación cuando el diseño te satisface completamente.",
    },
    {
      q: "¿Son una alternativa a Madecentro, Jamar o Homecenter para cocinas?",
      a: "Somos una alternativa diferente: no vendemos muebles estándar de catálogo como Madecentro, Jamar o Homecenter. Fabricamos cocinas integrales, closets y muebles de madera completamente a medida, adaptados a tu espacio, con diseño incluido, renders previos y proceso de fabricación e instalación con seguimiento.",
    },
    {
      q: "¿Cómo funciona el proceso de cotización de carpintería a medida?",
      a: "Es 100% digital: 1) Nos cuentas tu proyecto por WhatsApp o formulario. 2) En 24-48 horas recibes propuesta con precio y renders. 3) Confirmas con abono del 35% online (Mercado Pago). 4) Visita técnica para medidas exactas. 5) Fabricación en 3-5 semanas. 6) Instalación y pago del saldo. Sin sorpresas.",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
