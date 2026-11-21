import type { ReactNode } from "react";
import { BarraAdmin } from "@/components/admin/BarraAdmin";
import { rolActual } from "@/lib/sesion";

/** Marco del admin: barra propia con menú según el rol. Sin sesión (página de entrada) no hay menú. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const rol = await rolActual().catch(() => null);
  return (
    <>
      {rol && <BarraAdmin rol={rol} />}
      {children}
    </>
  );
}
