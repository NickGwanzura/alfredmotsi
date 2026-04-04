import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    // Protect admin routes
    if (req.nextUrl.pathname.startsWith("/admin") && req.nextauth.token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // Protect API routes
    if (req.nextUrl.pathname.startsWith("/api/admin") && req.nextauth.token?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // Allow public routes
        if (req.nextUrl.pathname === "/login") return true;
        if (req.nextUrl.pathname.startsWith("/api/auth")) return true;
        
        // Require auth for all other routes
        return token !== null;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
