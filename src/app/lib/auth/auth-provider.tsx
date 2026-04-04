"use client";

// MOCK AUTH - Authentication bypassed for development
// Change to real auth later by switching imports back

import { 
  MockAuthProvider, 
  useSession as useMockSession, 
  signOut as mockSignOut, 
  signIn as mockSignIn 
} from "./mock-auth-provider";

// Re-export for compatibility
export const AuthProvider = MockAuthProvider;
export const useSession = useMockSession;
export const signOut = mockSignOut;
export const signIn = mockSignIn;

// For components that import SessionProvider directly
export { MockAuthProvider as SessionProvider };
