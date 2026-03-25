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
      className="inline-flex items-center justify-center border border-neutral-300 px-4 py-2 text-sm font-medium text-ink hover:border-ink"
    >
      Cerrar sesión
    </button>
  );
}
