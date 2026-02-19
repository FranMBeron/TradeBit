import { NextRequest, NextResponse } from "next/server";
import { decodeToken, isTokenExpired } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

// Rutas que redirigen a /feed si el usuario ya está autenticado
const AUTH_ONLY_ROUTES = ["/login", "/register"];
// Rutas accesibles siempre que el usuario esté autenticado (setup post-registro)
const SETUP_ROUTES = ["/connect-wallbit"];
// Rutas públicas: accesibles sin autenticación, nunca redirigidas
const PUBLIC_ROUTES = ["/verify-email"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Public routes bypass all auth checks
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r));
  const isSetupRoute = SETUP_ROUTES.some((r) => pathname.startsWith(r));

  // Decode token if present
  const payload = accessToken ? decodeToken(accessToken) : null;
  const tokenValid = payload !== null && !isTokenExpired(payload);

  // Login/register: redirigir a /feed si ya está autenticado
  if (isAuthOnlyRoute) {
    if (tokenValid) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.next();
  }

  // Setup routes (connect-wallbit): accesibles si está autenticado, sino a /login
  if (isSetupRoute) {
    if (tokenValid) {
      return NextResponse.next();
    }
    // sin token válido → intentar refresh o redirigir a login (cae al bloque de abajo)
  }

  // Protected routes: need valid token
  if (tokenValid) {
    return NextResponse.next();
  }

  // Token expired or missing — try silent refresh
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { Cookie: `refresh_token=${refreshToken}` },
      });

      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as { accessToken: string };
        const response = NextResponse.next();
        response.cookies.set("access_token", data.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 15 * 60,
        });
        return response;
      }
    } catch {
      // refresh fetch failed — fall through to login redirect
    }
  }

  // No valid token, no refreshable session → login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
