/** Enlace wa.me usando NEXT_PUBLIC_WHATSAPP_PHONE desde .env.local */
export function getWhatsAppHref(prefillMessage?: string): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.replace(/\D/g, "") ?? "";
  if (!phone) return "#contacto";
  const base = `https://wa.me/${phone}`;
  if (!prefillMessage) return base;
  return `${base}?text=${encodeURIComponent(prefillMessage)}`;
}
