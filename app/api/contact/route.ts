import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  name: string;
  email: string;
  phone?: string;
  city: string;
  message: string;
  website?: string; // honeypot
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/contact
 * - Si existe RESEND_API_KEY: envía correo vía Resend (configurar dominio en resend.com).
 * - Si no: solo valida y devuelve ok (modo desarrollo); revisar logs en Vercel.
 *
 * Importante (Resend): el campo `from` NO puede ser @gmail.com. Debe ser un correo del
 * dominio verificado en Resend (ej. info@hechomadera.com). El aviso llega a CONTACT_TO_EMAIL
 * (puede ser infohechomadera@gmail.com). reply_to = email del visitante para responderle.
 */
export async function POST(request: Request) {
  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (json.website) {
    // Honeypot anti-bots
    return NextResponse.json({ ok: true });
  }

  const name = (json.name ?? "").trim();
  const email = (json.email ?? "").trim().toLowerCase();
  const phone = (json.phone ?? "").trim();
  const city = (json.city ?? "").trim();
  const message = (json.message ?? "").trim();

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (!city) {
    return NextResponse.json({ error: "Ciudad requerida" }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Mensaje demasiado corto" }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Mensaje demasiado largo" }, { status: 400 });
  }

  /** Dónde recibes los avisos (puede ser Gmail) */
  const to = process.env.CONTACT_TO_EMAIL ?? "infohechomadera@gmail.com";
  const key = process.env.RESEND_API_KEY;

  const html = `
    <h2>Nuevo contacto — Hechomadera web</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(phone || "—")}</p>
    <p><strong>Ciudad:</strong> ${escapeHtml(city)}</p>
    <p><strong>Mensaje:</strong></p>
    <pre style="white-space:pre-wrap;font-family:sans-serif;">${escapeHtml(message)}</pre>
  `;

  if (key) {
    /** Remitente: dominio verificado en Resend (no usar @gmail.com aquí) */
    const from = process.env.RESEND_FROM ?? "Hechomadera <info@hechomadera.com>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Web] Contacto — ${name}`,
        html,
        reply_to: email,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Resend error:", res.status, text);
      return NextResponse.json({ error: "No se pudo enviar el correo. Intenta más tarde." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: true });
  }

  console.info("[contact] Sin RESEND_API_KEY — mensaje recibido (no enviado por email):", {
    name,
    email,
    city,
  });

  return NextResponse.json({
    ok: true,
    sent: false,
    hint: "Configura RESEND_API_KEY y CONTACT_TO_EMAIL en Vercel para enviar correos.",
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
