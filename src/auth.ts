import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Staff login
    Credentials({
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const email = (credentials.email as string).toLowerCase().trim();
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, password: true, role: true, image: true, passwordChanged: true },
          });

          if (!user || !user.password) return null;

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValidPassword) {
            // Audit failed login attempt
            await prisma.auditLog.create({
              data: {
                userName: email,
                action: 'failed_login',
                reason: `Failed login attempt for ${email}`,
              },
            }).catch(() => {});
            return null;
          }

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
    // Customer portal login
    Credentials({
      id: "portal",
      credentials: {
        email: { label: "Email", type: "email" },
        portalCode: { label: "Portal Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.portalCode) return null;
        try {
          const customer = await prisma.customer.findFirst({
            where: {
              email: (credentials.email as string).toLowerCase().trim(),
              portalEnabled: true,
              portalCode: (credentials.portalCode as string).toUpperCase().trim(),
            },
          });
          if (!customer) {
            // Audit failed portal login
            await prisma.auditLog.create({
              data: {
                userName: (credentials.email as string).toLowerCase().trim(),
                action: 'failed_login',
                reason: 'Failed portal login attempt',
              },
            }).catch(() => {});
            return null;
          }
          return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            role: 'client',
            image: null,
            passwordChanged: true, // Portal users don't use password auth
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
    updateAge: 60 * 60,   // Rolling refresh every 1 hour of activity
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
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
  // Only trust specific hosts instead of all hosts
  trustHost: process.env.NODE_ENV === 'development' || process.env.TRUSTED_HOSTS?.split(',').includes(
    process.env.NEXTAUTH_URL || ''
  ),
});
