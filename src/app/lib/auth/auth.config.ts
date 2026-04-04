import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";

// Runtime env check - fail fast with clear message
if (!process.env.NEXTAUTH_SECRET) {
  console.error("❌ CRITICAL: NEXTAUTH_SECRET is not set!");
  console.error("   Generate one with: openssl rand -base64 32");
}

if (!process.env.NEXTAUTH_URL) {
  console.warn("⚠️ NEXTAUTH_URL is not set. Using default.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize called with email:", credentials?.email);
        
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] Missing credentials");
            return null; // Return null, don't throw
          }

          console.log("[AUTH] Looking up user in database...");
          
          let user;
          try {
            user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });
          } catch (dbError) {
            console.error("[AUTH] Database connection error:", dbError);
            return null;
          }

          if (!user) {
            console.log("[AUTH] User not found:", credentials.email);
            return null;
          }

          console.log("[AUTH] User found, validating password...");

          // Validate password
          let isValidPassword = false;
          
          if (!user.password) {
            console.log("[AUTH] User has no password set");
            return null;
          }
          
          if (user.password.startsWith('$2')) {
            // Password is hashed with bcrypt
            isValidPassword = await bcrypt.compare(credentials.password, user.password);
          } else {
            // Fallback for plain text (migration)
            isValidPassword = credentials.password === user.password;
          }

          if (!isValidPassword) {
            console.log("[AUTH] Invalid password for user:", credentials.email);
            return null;
          }

          console.log("[AUTH] Authentication successful:", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? 'User',
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error("[AUTH] Unexpected error in authorize:", error);
          return null; // Always return null on error, never throw
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      console.log("[AUTH] JWT callback - user:", user?.email || "none");
      
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token, user }) {
      console.log("[AUTH] Session callback - token.id:", token?.id);
      
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      console.log("[AUTH] SignIn callback - user:", user?.email || "none");
      return true;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true",
  logger: {
    error: (code, metadata) => {
      console.error("[NEXTAUTH ERROR]", code, metadata);
    },
    warn: (code) => {
      console.warn("[NEXTAUTH WARN]", code);
    },
    debug: (code, metadata) => {
      console.log("[NEXTAUTH DEBUG]", code, metadata);
    },
  },
};
