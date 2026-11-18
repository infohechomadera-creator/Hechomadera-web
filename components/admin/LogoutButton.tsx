"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="boton-borde !py-2.5"
    >
      Cerrar sesión
    </button>
  );
}
