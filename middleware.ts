import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get("hm_admin")?.value;
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && session === expected;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip the login page and the auth API endpoint
  if (pathname === "/admin/login" || pathname === "/api/admin/auth") {
    return NextResponse.next();
  }

  // Protect /admin/* UI routes — redirect to login
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // Protect /api/admin/* routes — return 401
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }

  // Protect /pago/prueba — solo admins
  if (pathname === "/pago/prueba") {
    if (!isAuthenticated(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/pago/prueba"],
};
