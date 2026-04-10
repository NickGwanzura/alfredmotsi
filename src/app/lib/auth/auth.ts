import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export { auth };

// Middleware helper for route protection in API routes
export async function requireAuth(req: NextRequest, allowedRoles?: string[]) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Authentication error" }, { status: 500 });
  }
}

export function isAdmin(role: string) { return role === "admin"; }
export function isTech(role: string)  { return role === "tech"; }
export function isClient(role: string) { return role === "client"; }
