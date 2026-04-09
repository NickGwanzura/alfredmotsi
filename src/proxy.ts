import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Allow unauthenticated access to the sign-in page and auth API
  if (pathname === "/" || pathname.startsWith("/api/auth")) {
    // Redirect authenticated users away from "/" to dashboard
    // (handled client-side via useSession — no server redirect needed)
    return NextResponse.next();
  }

  // Require auth for all other routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
