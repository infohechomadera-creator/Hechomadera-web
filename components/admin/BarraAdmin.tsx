"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";
import type { Rol } from "@/lib/acceso";

type Opcion = { href: string; texto: string; exacto?: boolean };

const OPCIONES: Record<Rol, Opcion[]> = {
  gerencia: [
    { href: "/admin/leads", texto: "Leads" },
    { href: "/admin/precios", texto: "Precios" },
    { href: "/admin", texto: "Órdenes de tienda", exacto: true },
  ],
  asesor: [{ href: "/admin/leads", texto: "Mis leads" }],
};

/** Barra propia del admin: opciones según el rol, menú hamburguesa en el celular y salir. */
export function BarraAdmin({ rol }: { rol: Rol }) {
  const ruta = usePathname() ?? "";
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  // Al cambiar de página se cierra el menú del celular.
  useEffect(() => setAbierto(false), [ruta]);

  const activa = (o: Opcion) => (o.exacto ? ruta === o.href || ruta.startsWith("/admin/orders") : ruta.startsWith(o.href));

  async function salir() {
    await clienteNavegador().auth.signOut().catch(() => undefined);
    router.push("/admin/login");
    router.refresh();
  }

  const enlace = (o: Opcion, movil: boolean) => (
    <Link
      key={o.href}
      href={o.href}
      aria-current={activa(o) ? "page" : undefined}
      className={
        movil
          ? `block border-b border-neutral-100 px-4 py-4 text-base ${activa(o) ? "font-semibold text-ink" : "text-ink-muted"}`
          : `px-3 py-2 text-sm ${activa(o) ? "font-semibold text-ink underline underline-offset-8" : "text-ink-muted hover:text-ink"}`
      }
    >
      {o.texto}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/admin/leads" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Hechomadera" width={226} height={22} className="h-5 w-auto object-contain" />
          <span className="border border-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink">
            {rol === "gerencia" ? "Gerencia" : "Asesor"}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
          {OPCIONES[rol].map((o) => enlace(o, false))}
          <a href="/" target="_blank" rel="noopener" className="px-3 py-2 text-sm text-ink-muted hover:text-ink">
            Ver sitio ↗
          </a>
          <button type="button" onClick={salir} className="ml-2 border border-neutral-300 px-3 py-2 text-sm text-ink hover:border-ink">
            Salir
          </button>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center border border-neutral-300 md:hidden"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
        >
          <span aria-hidden className="text-xl leading-none text-ink">
            {abierto ? "×" : "☰"}
          </span>
        </button>
      </div>

      {abierto && (
        <nav className="border-t border-neutral-200 bg-paper md:hidden" aria-label="Admin">
          {OPCIONES[rol].map((o) => enlace(o, true))}
          <a href="/" target="_blank" rel="noopener" className="block border-b border-neutral-100 px-4 py-4 text-base text-ink-muted">
            Ver sitio ↗
          </a>
          <button type="button" onClick={salir} className="block w-full px-4 py-4 text-left text-base text-ink">
            Salir
          </button>
        </nav>
      )}
    </header>
  );
}
