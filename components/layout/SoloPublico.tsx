"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Muestra lo de la web pública (menú, pie, WhatsApp, cookies) en todas partes menos dentro del admin. */
export function SoloPublico({ children }: { children: ReactNode }) {
  const ruta = usePathname() ?? "";
  if (ruta === "/admin" || ruta.startsWith("/admin/")) return null;
  return <>{children}</>;
}
