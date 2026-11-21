import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { decidirAcceso, zonaProtegida, type Rol } from "@/lib/acceso";

/** Lee la sesión de Supabase (y la renueva) y devuelve el rol activo del usuario, si tiene. */
async function rolDeSesion(request: NextRequest, response: NextResponse): Promise<Rol | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publica) return null;
  const supabase = createServerClient(url, publica, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value, options } of lista) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  // RLS: cada usuario solo puede leer su propio perfil.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo")
    .eq("id", data.user.id)
    .maybeSingle();
  return perfil?.activo ? (perfil.rol as Rol) : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
  if (!zonaProtegida(pathname)) return response;

  const rol = await rolDeSesion(request, response).catch(() => null);
  const decision = decidirAcceso(pathname, rol);

  if (decision === "permitir") return response;
  if (decision === "no_autorizado_api") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const destino = request.nextUrl.clone();
  if (decision === "ir_a_leads") {
    destino.pathname = "/admin/leads";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  destino.pathname = "/admin/login";
  destino.search = decision === "sin_permiso" ? "?aviso=sin_permiso" : "";
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/pago/prueba"],
};
