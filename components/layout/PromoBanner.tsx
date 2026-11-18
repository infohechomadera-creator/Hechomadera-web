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
    <div className="border-b border-ink bg-ink text-center text-paper">
      <Link
        href={href}
        className="block px-4 py-2.5 text-xs font-medium tracking-wide hover:bg-neutral-800 md:text-sm"
      >
        {text}
      </Link>
    </div>
  );
}
