import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth.config";
import { NextRequest, NextResponse } from "next/server";

// Get session on the server
export async function auth() {
  return await getServerSession(authOptions);
}

// Middleware helper for route protection
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return null; // No error, user is authorized
}

// Check if user is admin
export function isAdmin(role: string): boolean {
  return role === "admin";
}

// Check if user is tech
export function isTech(role: string): boolean {
  return role === "tech";
}

// Check if user is client
export function isClient(role: string): boolean {
  return role === "client";
}
