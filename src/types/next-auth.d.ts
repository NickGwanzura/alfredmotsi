import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      passwordChanged: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    passwordChanged: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    passwordChanged?: boolean;
  }
}
