"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hechomadera_cookie_consent_v1";

/**
 * Aviso mínimo de cookies (Colombia / buenas prácticas).
 * No sustituye asesoría legal ni un CMP completo si usáis publicidad segmentada.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v !== "accepted") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-neutral-200 bg-paper p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:p-5"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className="text-sm text-ink-muted">
          Usamos cookies técnicas necesarias para el funcionamiento del sitio y, si lo aceptás, podemos mejorar la experiencia. Más
          información en nuestra{" "}
          <Link href="/legal/cookies" className="underline text-ink">
            política de cookies
          </Link>{" "}
          y{" "}
          <Link href="/legal/privacidad" className="underline text-ink">
            privacidad
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={accept}
            className="border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-neutral-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
