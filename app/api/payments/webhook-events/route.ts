import { NextResponse } from "next/server";
import { listWebhookEvents } from "@/lib/webhook-events";

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
 * GET /api/payments/webhook-events?limit=20&token=...
 * Debug endpoint temporal para ver ultimos eventos webhook en memoria.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "No autorizado. Envia x-debug-token o token=? y configura DEBUG_WEBHOOK_TOKEN en Vercel.",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const events = listWebhookEvents(limit);
  return NextResponse.json({
    ok: true,
    count: events.length,
    events,
  });
}
