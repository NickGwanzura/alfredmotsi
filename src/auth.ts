import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "@/app/lib/auth/login-rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Staff login
    Credentials({
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const email = (credentials.email as string).toLowerCase().trim();
          if (isLoginBlocked(email, request)) return null;
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, password: true, role: true, image: true, passwordChanged: true, updatedAt: true },
          });

          if (!user || !user.password) return null;

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValidPassword) {
            recordLoginFailure(email, request);
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

          clearLoginFailures(email, request);

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "User",
            role: user.role,
            image: user.image,
            passwordChanged: user.passwordChanged,
            userUpdatedAt: user.updatedAt.toISOString(),
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
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.portalCode) return null;
        try {
          const email = (credentials.email as string).toLowerCase().trim();
          if (isLoginBlocked(email, request)) return null;
          const customer = await prisma.customer.findFirst({
            where: {
              email,
              portalEnabled: true,
              portalCode: (credentials.portalCode as string).toUpperCase().trim(),
            },
          });
          if (!customer) {
            recordLoginFailure(email, request);
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
          clearLoginFailures(email, request);
          return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            role: 'client',
            image: null,
            passwordChanged: true, // Portal users don't use password auth
            userUpdatedAt: customer.updatedAt.toISOString(),
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
        token.userUpdatedAt = (user as any).userUpdatedAt;
      }

      // On every token access, verify passwordChanged hasn't changed since token was issued.
      // This invalidates old sessions after password change/reset.
      // Also always refresh role from DB to handle enum changes.
      if (trigger !== "signIn" && trigger !== "signUp" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { passwordChanged: true, role: true, updatedAt: true },
          });
          if (token.role === 'client') {
            const customer = await prisma.customer.findUnique({
              where: { id: token.id as string },
              select: { updatedAt: true, portalEnabled: true },
            });
            if (!customer || !customer.portalEnabled) {
              token.invalidated = true;
            } else if (token.userUpdatedAt && customer.updatedAt.toISOString() !== token.userUpdatedAt) {
              token.invalidated = true;
            }
          } else if (dbUser) {
            // Always refresh role to handle DB enum migrations
            token.role = dbUser.role;
            // Any account update, including a password reset, invalidates the
            // old JWT. The previous implementation merely copied a boolean,
            // so old sessions stayed valid indefinitely.
            if (token.userUpdatedAt && dbUser.updatedAt.toISOString() !== token.userUpdatedAt) {
              token.invalidated = true;
            }
            token.passwordChanged = dbUser.passwordChanged;
          } else if (token.role) {
            // A deleted staff account must not retain access until JWT expiry.
            token.invalidated = true;
          }
        } catch {
          // Silently fail — next request will retry
        }
      }

      return token;
    },
    session({ session, token }) {
      if ((token as any)?.invalidated) return null as any;
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
  // Auth.js runs behind Dokploy's reverse proxy in production. The domain is
  // controlled by this deployment, so trust the forwarded host explicitly.
  trustHost: true,
});
