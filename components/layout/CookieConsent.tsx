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
      className="tarjeta fixed inset-x-3 bottom-3 z-[120] p-5 shadow-suave sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md sm:p-6"
    >
      <p className="text-sm font-semibold text-ink">Cookies y privacidad</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted sm:text-sm">
        Usamos cookies necesarias para el funcionamiento del sitio. Con tu permiso,
        activamos también Google Analytics para entender cómo mejorar la experiencia.
        Ningún dato se vende a terceros. Más en nuestra{" "}
        <Link href="/legal/cookies" className="text-ink underline underline-offset-2">política de cookies</Link>{" "}
        y{" "}
        <Link href="/legal/privacidad" className="text-ink underline underline-offset-2">privacidad</Link>.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={decline}
          className="boton-neutro !py-2.5"
        >
          Solo necesarias
        </button>
        <button
          type="button"
          onClick={accept}
          className="boton-primario !py-2.5"
        >
          Aceptar todas
        </button>
      </div>
    </div>
  );
}
