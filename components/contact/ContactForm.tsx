"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { track } from "@/lib/analytics";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      city: String(fd.get("city") ?? ""),
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean; hint?: string };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Error al enviar");
        return;
      }

      setStatus("success");
      track("contact_form_submit", { city: payload.city });
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage("Error de red. Intenta de nuevo.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          className="border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="phone" className="text-sm font-medium text-ink">
          Teléfono / WhatsApp
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="city" className="text-sm font-medium text-ink">
          Ciudad
        </label>
        <select
          id="city"
          name="city"
          required
          defaultValue=""
          className="border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {siteConfig.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium text-ink">
          ¿En qué podemos ayudarte?
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          className="resize-y border border-neutral-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
        />
      </div>

      {/* Honeypot: oculto para humanos */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && errorMessage && (
        <p className="text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {status === "success" && (
        <p className="text-sm text-green-800" role="status">
          Mensaje enviado. Te responderemos en el menor tiempo posible.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full border border-ink bg-ink px-3 py-3 text-sm font-medium text-paper hover:bg-neutral-800 disabled:opacity-60"
      >
        {status === "loading" ? "Enviando…" : "Enviar mensaje"}
      </button>

      <p className="text-xs text-ink-muted">
        Al enviar aceptas el tratamiento de datos según nuestra política de privacidad. Respuesta orientativa: formulario &lt; 3h
        (objetivo operativo).
      </p>
    </form>
  );
}
