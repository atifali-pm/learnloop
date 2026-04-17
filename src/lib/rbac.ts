import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

/**
 * Admins have org-wide access; other roles only pass if they own the target.
 */
export async function requireOwnerOrAdmin(ownerUserId: string) {
  const user = await requireUser();
  if (user.role !== "admin" && user.id !== ownerUserId) {
    redirect("/forbidden");
  }
  return user;
}

/**
 * Guard for cross-tenant reads: throws if the target row's organizationId
 * does not match the current user's.
 */
export function assertSameTenant(
  user: { organizationId: string },
  resource: { organizationId: string } | null | undefined,
) {
  if (!resource || resource.organizationId !== user.organizationId) {
    redirect("/forbidden");
  }
}
