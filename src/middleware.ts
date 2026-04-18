import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forbidden") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks/drain") ||
    pathname.startsWith("/api/health");

  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = req.auth.user?.role;

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/forbidden", req.nextUrl));
  }
  if (pathname.startsWith("/instructor") && role !== "instructor" && role !== "admin") {
    return NextResponse.redirect(new URL("/forbidden", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
