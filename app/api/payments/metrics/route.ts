import { NextResponse } from "next/server";
import { listWebhookEvents, summarizeWebhookEvents } from "@/lib/webhook-events";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const token = process.env.DEBUG_WEBHOOK_TOKEN;
  if (!token) return false;
  const headerToken = request.headers.get("x-debug-token");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const provided = headerToken ?? queryToken;
  return provided === token;
}

/**
 * GET /api/payments/metrics?limit=100&token=...
 * Resumen de eventos webhook de pagos para monitoreo rápido.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "No autorizado. Envia x-debug-token o token=?." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const events = await listWebhookEvents(limit);
  const summary = summarizeWebhookEvents(events);

  return NextResponse.json({
    ok: true,
    sampled_events: events.length,
    summary,
  });
}
