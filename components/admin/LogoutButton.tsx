"use client";

import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    // Cierra la sesión de Supabase y la de la contraseña anterior (respaldo).
    await clienteNavegador().auth.signOut().catch(() => undefined);
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center justify-center border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink"
    >
      Cerrar sesión
    </button>
  );
}
