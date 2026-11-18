"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { navItems } from "@/lib/site-config";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const wa = getWhatsAppHref("Hola Hechomadera, quiero hablar con un asesor.");

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Hechomadera — Cocinas Integrales y Carpintería a Medida en Colombia"
            width={226}
            height={22}
            className="h-6 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track-nav={item.href}
              title={item.label}
              className="rounded px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-ink hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button href="/tienda" variant="secondary" className="!px-3 !py-2 text-xs">
            Comprar
          </Button>
          <Button href="/contacto" variant="secondary" className="!px-3 !py-2 text-xs">
            Cotizar
          </Button>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="header"
            className="inline-flex items-center justify-center border border-ink bg-ink px-3 py-2 text-xs font-medium text-paper hover:bg-neutral-800"
          >
            WhatsApp
          </a>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center border border-ink px-3 py-2 text-sm lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Cerrar" : "Menú"}
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-200 bg-paper lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Móvil">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2 py-3 text-sm text-ink"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
              <Button href="/tienda">Comprar</Button>
              <Button href="/contacto" variant="secondary">
                Cotizar
              </Button>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="header_mobile"
                className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper"
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
