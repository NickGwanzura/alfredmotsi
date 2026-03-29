import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/auth/auth.config";

// Wrap handler with error logging
const handler = async (req: Request) => {
  console.log("[AUTH] Request received:", req.method, req.url);
  
  try {
    // Log environment state (safe)
    console.log("[AUTH] NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "NOT SET");
    console.log("[AUTH] NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "SET (hidden)" : "NOT SET");
    console.log("[AUTH] DATABASE_URL:", process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET");
    
    const nextAuthHandler = NextAuth(authOptions);
    const response = await nextAuthHandler(req);
    
    console.log("[AUTH] Response status:", response.status);
    return response;
  } catch (error) {
    console.error("[AUTH] CRITICAL ERROR in auth handler:");
    console.error(error);
    
    return new Response(
      JSON.stringify({ 
        error: "Authentication system error", 
        details: String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

export { handler as GET, handler as POST };
