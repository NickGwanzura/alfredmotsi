import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) return null;

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValidPassword) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "User",
            role: user.role,
            image: user.image,
            passwordChanged: user.passwordChanged,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.passwordChanged = (user as any).passwordChanged;
      }

      if (trigger === "update" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, passwordChanged: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.passwordChanged = dbUser.passwordChanged;
          }
        } catch {
          // Silently fail — next request will retry
        }
      }

      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).passwordChanged = token.passwordChanged as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
