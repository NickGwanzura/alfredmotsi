import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/auth/auth.config";

// Standard NextAuth handler for App Router
// @ts-ignore - NextAuth types may not match Next.js 15+ exactly
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
