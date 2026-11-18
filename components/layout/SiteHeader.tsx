"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "@/lib/site-config";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const wa = getWhatsAppHref("Hola Hechomadera, quiero hablar con un asesor.");
  const activo = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-50 bg-paper/85 backdrop-blur-md">
      <div className="contenedor flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Hechomadera — Cocinas Integrales y Carpintería a Medida en Colombia"
            width={226}
            height={22}
            className="h-5 w-auto object-contain md:h-6"
            priority
          />
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-cloud bg-snow p-1 lg:flex"
          aria-label="Principal"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track-nav={item.href}
              title={item.label}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                activo(item.href) ? "bg-paper text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button href="/tienda" variant="neutral" className="!py-2.5">
            Comprar
          </Button>
          <Button href="/contacto" variant="neutral" className="!py-2.5">
            Cotizar
          </Button>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="header"
            className="boton-primario boton-pill !py-2.5"
          >
            WhatsApp
          </a>
        </div>

        <button
          type="button"
          className="boton-neutro !py-2 lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Cerrar" : "Menú"}
        </button>
      </div>

      {open && (
        <div className="contenedor pb-4 lg:hidden">
          <nav className="tarjeta flex flex-col gap-1 p-3" aria-label="Móvil">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-button px-4 py-3 text-base ${activo(item.href) ? "bg-paper text-ink" : "text-graphite"}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-cloud pt-3">
              <Button href="/tienda">Comprar</Button>
              <Button href="/contacto" variant="neutral">
                Cotizar
              </Button>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="header_mobile"
                className="boton-borde"
              >
                WhatsApp
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
