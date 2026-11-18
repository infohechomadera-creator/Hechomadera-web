import Link from "next/link";

/**
 * Banner opcional arriba del contenido. Activar en Vercel:
 * NEXT_PUBLIC_PROMO_ENABLED=true
 * NEXT_PUBLIC_PROMO_TEXT=Tu mensaje corto
 * NEXT_PUBLIC_PROMO_LINK=/contacto (opcional)
 */
export function PromoBanner() {
  const enabled = process.env.NEXT_PUBLIC_PROMO_ENABLED === "true";
  const text = (process.env.NEXT_PUBLIC_PROMO_TEXT ?? "").trim();
  const href = process.env.NEXT_PUBLIC_PROMO_LINK?.trim() || "/contacto";

  if (!enabled || !text) return null;

  return (
    <div className="bg-obsidian text-center text-snow">
      <Link
        href={href}
        className="block px-4 py-2.5 text-caption font-medium transition-colors hover:bg-graphite focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-snow md:text-sm"
      >
        {text}
      </Link>
    </div>
  );
}
