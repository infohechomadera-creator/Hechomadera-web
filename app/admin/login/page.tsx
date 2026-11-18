"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Contraseña incorrecta.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contenedor flex min-h-[80vh] items-center justify-center py-14">
      <div className="tarjeta w-full max-w-sm p-7 md:p-9">
        <p className="titulo-tarjeta">Panel de administración</p>
        <p className="mt-1 text-sm text-ink-muted">Ingresa la contraseña para continuar.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="eyebrow block">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="campo mt-2"
            />
          </div>

          {error && (
            <p className="rounded-input border border-cloud bg-paper-dim px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="boton-primario w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
