export function createOrderId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `ord_${ts}_${rand}`;
}

export function sanitizeSourceReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
  return clean || null;
}
