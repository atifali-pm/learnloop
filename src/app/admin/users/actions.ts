"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["learner", "instructor", "admin"]),
});

export async function changeUserRole(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.organizationId !== admin.organizationId) {
    throw new Error("forbidden");
  }
  if (target.id === admin.id && parsed.data.role !== "admin") {
    throw new Error("cannot_demote_self");
  }

  const previous = target.role;
  const nextRole = parsed.data.role as Role;
  if (previous === nextRole) return;

  await prisma.user.update({
    where: { id: target.id },
    data: { role: nextRole },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "user.role.change",
    target: target.id,
    metadata: { email: target.email, from: previous, to: nextRole },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${target.id}`);
}

const toggleSchema = z.object({
  userId: z.string().min(1),
  disabled: z.enum(["true", "false"]),
});

export async function toggleUserDisabled(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = toggleSchema.safeParse({
    userId: formData.get("userId"),
    disabled: formData.get("disabled"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.organizationId !== admin.organizationId) {
    throw new Error("forbidden");
  }
  if (target.id === admin.id) throw new Error("cannot_disable_self");

  const nextDisabled = parsed.data.disabled === "true";
  if (target.disabled === nextDisabled) return;

  await prisma.user.update({
    where: { id: target.id },
    data: { disabled: nextDisabled },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: nextDisabled ? "user.disable" : "user.enable",
    target: target.id,
    metadata: { email: target.email },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${target.id}`);
}
