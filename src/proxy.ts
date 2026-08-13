import { auth } from "@/auth";
import { NextResponse } from "next/server";

const FINANCE_PATH_PREFIXES = [
  "/api/invoices",
  "/api/payments",
  "/api/reports",
  "/api/financial",
  "/api/analytics",
];

// Routes like /api/users, /api/crm, /api/gas-stock, /api/gas-usage,
// /api/audit, and /api/consumables allow tech access and enforce their
// own role checks in the route handlers — do not blanket-block them here.
const ADMIN_API_PREFIXES = [
  "/api/admin",
];

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  if (
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/reset-password")
  ) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const userRole = req.auth?.user?.role;
  const isAdminRole = userRole === "admin" || userRole === "owner";
  const isFinanceRole = isAdminRole || userRole === "accounts";

  // Block non-admin access to finance routes
  for (const prefix of FINANCE_PATH_PREFIXES) {
    if (pathMatchesPrefix(pathname, prefix)) {
      if (!isFinanceRole) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  // /api/admin/funds allows tech access (techs view their own allocations
  // and record expenses); its handlers scope every operation to the
  // assigned tech, so let it through to route-level checks
  const isTechAccessibleAdminRoute = pathMatchesPrefix(pathname, "/api/admin/funds");

  // Block non-admin access to admin API routes
  for (const prefix of ADMIN_API_PREFIXES) {
    if (pathMatchesPrefix(pathname, prefix) && !isAdminRole && !isTechAccessibleAdminRoute) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // Block non-admin access to admin pages
  if (pathname.startsWith("/admin") && !isAdminRole) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)"],
};
