import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!request.cookies.get("admin_token")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (["/profile", "/quiz"].some((p) => pathname.startsWith(p))) {
    if (!request.cookies.get("token")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/quiz/:path*", "/admin/:path*"],
};
