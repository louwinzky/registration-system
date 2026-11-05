import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Which roles may open which top-level module. */
export const MODULE_ACCESS: Record<string, Role[]> = {
  "/registrar": ["REGISTRAR", "ADMIN"],
  "/cashier": ["CASHIER", "ADMIN"],
  "/admin": ["ADMIN"],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  REGISTRAR: "/registrar",
  CASHIER: "/cashier",
};

/** Use at the top of server components / server actions. */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (roles.length && !roles.includes(session.user.role)) redirect("/forbidden");
  return session.user;
}
