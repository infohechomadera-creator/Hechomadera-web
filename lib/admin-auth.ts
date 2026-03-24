export function isValidAdminToken(provided: string | null | undefined): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  return provided === token;
}

export function isAdminAuthorized(request: Request): boolean {
  const headerToken = request.headers.get("x-admin-token");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const provided = headerToken ?? queryToken;
  return isValidAdminToken(provided);
}
