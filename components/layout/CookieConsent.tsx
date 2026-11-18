"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { setConsent, CONSENT_KEY } from "@/lib/analytics";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      if (v !== "accepted" && v !== "necessary") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    setConsent("accepted");
    setVisible(false);
  }

  function decline() {
    setConsent("necessary");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-neutral-200 bg-paper shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Cookies y privacidad</p>
            <p className="mt-1 text-sm text-ink-muted">
              Usamos cookies necesarias para el funcionamiento del sitio. Con tu permiso,
              activamos también Google Analytics para entender cómo mejorar la experiencia.
              Ningún dato se vende a terceros. Más en nuestra{" "}
              <Link href="/legal/cookies" className="underline text-ink">política de cookies</Link>{" "}
              y{" "}
              <Link href="/legal/privacidad" className="underline text-ink">privacidad</Link>.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 md:flex-nowrap md:items-center">
            <button
              type="button"
              onClick={decline}
              className="border border-neutral-300 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={accept}
              className="border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-neutral-800"
            >
              Aceptar todas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
