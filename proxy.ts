import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const hasSessionCookie = request.cookies.has("shopditto_session");
  const isPublicPage = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isPublicPage) {
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};