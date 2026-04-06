"use client";

import { ReactNode, createContext, useContext } from "react";

const MockSessionContext = createContext({
  data: {
    user: {
      id: "admin-1",
      email: "admin@splashair.co.za",
      name: "Admin User",
      role: "admin",
    },
    expires: "2099-01-01T00:00:00.000Z",
  },
  status: "authenticated",
  update: async () => {},
});

export function useSession() {
  return useContext(MockSessionContext);
}

interface SignOutOptions {
  callbackUrl?: string;
}

export function signOut(options?: SignOutOptions) {
  // No-op in mock mode
  return Promise.resolve({ url: options?.callbackUrl || "/" });
}

export function signIn() {
  // No-op in mock mode - already authenticated
  return Promise.resolve({ error: null, status: 200, ok: true });
}

interface MockAuthProviderProps {
  children: ReactNode;
}

export function MockAuthProvider({ children }: MockAuthProviderProps) {
  return (
    <MockSessionContext.Provider
      value={{
        data: {
          user: {
            id: "admin-1",
            email: "admin@splashair.co.za",
            name: "Admin User",
            role: "admin",
          },
          expires: "2099-01-01T00:00:00.000Z",
        },
        status: "authenticated",
        update: async () => {},
      }}
    >
      {children}
    </MockSessionContext.Provider>
  );
}
