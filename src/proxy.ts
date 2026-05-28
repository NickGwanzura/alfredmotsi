import { auth } from "@/auth";
import { NextResponse } from "next/server";

const FINANCE_PATH_PREFIXES = [
  "/api/invoices",
  "/api/payments",
  "/api/reports",
  "/api/financial",
  "/api/analytics",
  "/api/contracts",
  "/api/quotations",
];

const ADMIN_API_PREFIXES = [
  "/api/admin",
  "/api/users",
  "/api/audit",
  "/api/crm",
  "/api/gas-stock",
  "/api/gas-usage",
  "/api/consumables",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  if (pathname === "/" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const userRole = req.auth?.user?.role;
  const isAdminRole = userRole === "admin";

  for (const prefix of FINANCE_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      if (!isAdminRole) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  if (pathname.startsWith("/api/admin") && !isAdminRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  for (const prefix of ADMIN_API_PREFIXES) {
    if (pathname === prefix || (pathname.startsWith(prefix + "/") && pathname.startsWith("/api/"))) {
      if (!isAdminRole) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith("/admin") && !isAdminRole) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
