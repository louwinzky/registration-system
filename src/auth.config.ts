import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe config (no Prisma / bcrypt here) so middleware can use it.
 * The Credentials provider is added in src/auth.ts.
 */
const MODULE_ACCESS: Record<string, Role[]> = {
  "/registrar": ["REGISTRAR", "ADMIN"],
  "/cashier": ["CASHIER", "ADMIN"],
  "/admin": ["ADMIN"],
};

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8-hour working day
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      const prefix = Object.keys(MODULE_ACCESS).find((p) =>
        pathname.startsWith(p),
      );
      if (!prefix) return true; // public route
      if (!user) return false; // -> redirected to /login
      if (!MODULE_ACCESS[prefix].includes(user.role)) {
        return Response.redirect(new URL("/forbidden", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as Role;
      session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
