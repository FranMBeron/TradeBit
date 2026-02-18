import { NextRequest, NextResponse } from "next/server";
import { decodeToken, isTokenExpired } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const AUTH_ROUTES = ["/login", "/register", "/connect-wallbit"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Decode token if present
  const payload = accessToken ? decodeToken(accessToken) : null;
  const tokenValid = payload !== null && !isTokenExpired(payload);

  // Auth routes: redirect to feed if already logged in
  if (isAuthRoute) {
    if (tokenValid) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.next();
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
