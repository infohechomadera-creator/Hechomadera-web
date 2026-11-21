/** Enlace wa.me usando NEXT_PUBLIC_WHATSAPP_PHONE desde .env.local */
export function getWhatsAppHref(prefillMessage?: string): string {
  // Si falta la variable, se usa el número de la empresa (antes quedaba un enlace roto a "#contacto").
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "573012890552").replace(/\D/g, "");
  const base = `https://wa.me/${phone}`;
  if (!prefillMessage) return base;
  return `${base}?text=${encodeURIComponent(prefillMessage)}`;
}
