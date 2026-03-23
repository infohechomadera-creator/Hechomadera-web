import crypto from "node:crypto";

function parseSignatureHeader(value: string | null): { ts: string; v1: string } | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => p.trim());
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Valida firma x-signature de Mercado Pago (HMAC SHA256).
 *
 * Manifest usado:
 *   id:{resourceId};request-id:{xRequestId};ts:{ts};
 */
export function validateMercadoPagoWebhookSignature(input: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  resourceId: string;
  secret: string | null | undefined;
}): { ok: boolean; reason?: string } {
  if (!input.secret) return { ok: false, reason: "missing_secret" };
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) return { ok: false, reason: "invalid_x_signature" };
  if (!input.requestIdHeader) return { ok: false, reason: "missing_x_request_id" };
  if (!input.resourceId) return { ok: false, reason: "missing_resource_id" };

  const manifest = `id:${input.resourceId};request-id:${input.requestIdHeader};ts:${parsed.ts};`;
  const digest = crypto.createHmac("sha256", input.secret).update(manifest).digest("hex");
  const ok = safeEqualHex(digest, parsed.v1);
  return ok ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}
