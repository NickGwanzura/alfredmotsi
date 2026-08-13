import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { canViewFinancials } from "@/app/lib/permissions";
import { stripJobFinancialFields } from "@/app/lib/jobTransform";

export { auth };

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

export function authenticate(session: unknown): { error: NextResponse | null; session: any } {
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export function authorizeRole(session: any, allowedRoles: string[]): NextResponse | null {
  const role = (session.user as any).role as string | undefined;
  // Owner is the highest-privilege administrative role and must retain
  // access to endpoints that historically listed only `admin`.
  const allowed = !!role && (allowedRoles.includes(role) || (role === "owner" && allowedRoles.includes("admin")));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function filterFinancialData<T extends Record<string, unknown>>(session: any, data: T): T {
  if (!canViewFinancials((session.user as any).role)) {
    return stripJobFinancialFields(data);
  }
  return data;
}

export function filterFinancialArray<T extends Record<string, unknown>>(session: any, data: T[]): T[] {
  if (!canViewFinancials((session.user as any).role)) {
    return data.map(stripJobFinancialFields);
  }
  return data;
}

export function isAdmin(role: string) { return role === "admin" || role === "owner"; }
export function isTech(role: string)  { return role === "tech"; }
export function isClient(role: string) { return role === "client"; }
