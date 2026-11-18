"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";

/** Ingreso de gerencia y asesores con su correo y contraseña (Supabase). */
function FormularioIngreso() {
  const router = useRouter();
  const aviso = useSearchParams().get("aviso");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: e2 } = await clienteNavegador().auth.signInWithPassword({ email, password });
      if (e2) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-neutral-200 bg-white p-8">
      <p className="font-display text-xl font-semibold text-ink">Panel de administración</p>
      <p className="mt-1 text-xs text-ink-muted">Ingresa con tu correo y contraseña.</p>

      {aviso === "sin_permiso" && (
        <p className="mt-4 border border-neutral-200 bg-paper-dim p-3 text-xs text-ink">
          Tu usuario no tiene acceso a esta sección. Si crees que es un error, habla con gerencia.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-neutral-300 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border border-neutral-300 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password || !email}
          className="w-full border border-ink bg-ink py-3 text-sm font-medium text-paper hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>

    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Suspense>
        <FormularioIngreso />
      </Suspense>
    </div>
  );
}
