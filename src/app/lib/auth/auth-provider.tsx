"use client";

import { SessionProvider, useSession, signOut, signIn } from "next-auth/react";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}

export { useSession, signOut, signIn };
export { SessionProvider };
