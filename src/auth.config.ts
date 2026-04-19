import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe slice of the Auth.js config.
 *
 * Contains: session strategy, pages, and JWT/session callbacks.
 * Does NOT contain: the Prisma adapter or any providers whose `authorize`
 * function uses Node-only modules (bcrypt, prisma). Those live in auth.ts.
 *
 * The middleware imports this file so the edge bundle stays under 1 MB.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: Role }).role;
        token.organizationId = (user as { organizationId: string }).organizationId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
