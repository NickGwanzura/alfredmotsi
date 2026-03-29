import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth.config";
import { NextRequest, NextResponse } from "next/server";

// Get session on the server
export async function auth() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

// Middleware helper for route protection
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
) {
  try {
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
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
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
