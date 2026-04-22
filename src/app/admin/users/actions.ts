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

const bulkRoleSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  role: z.enum(["learner", "instructor", "admin"]),
});

function parseUserIds(formData: FormData): string[] {
  return formData.getAll("userIds").filter((v): v is string => typeof v === "string");
}

export async function bulkChangeRole(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = bulkRoleSchema.safeParse({
    userIds: parseUserIds(formData),
    role: formData.get("role"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const targets = await prisma.user.findMany({
    where: { id: { in: parsed.data.userIds }, organizationId: admin.organizationId },
  });
  const allowed = targets
    .filter((t) => !(t.id === admin.id && parsed.data.role !== "admin"))
    .filter((t) => t.role !== parsed.data.role);

  if (allowed.length === 0) {
    revalidatePath("/admin/users");
    return;
  }

  await prisma.user.updateMany({
    where: { id: { in: allowed.map((t) => t.id) } },
    data: { role: parsed.data.role as Role },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "user.bulk.role.change",
    metadata: {
      count: allowed.length,
      to: parsed.data.role,
      userIds: allowed.map((t) => t.id),
    },
  });

  revalidatePath("/admin/users");
}

const bulkDisableSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  disabled: z.enum(["true", "false"]),
});

export async function bulkToggleDisabled(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = bulkDisableSchema.safeParse({
    userIds: parseUserIds(formData),
    disabled: formData.get("disabled"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const targets = await prisma.user.findMany({
    where: { id: { in: parsed.data.userIds }, organizationId: admin.organizationId },
  });
  const nextDisabled = parsed.data.disabled === "true";
  const allowed = targets
    .filter((t) => t.id !== admin.id || !nextDisabled)
    .filter((t) => t.disabled !== nextDisabled);

  if (allowed.length === 0) {
    revalidatePath("/admin/users");
    return;
  }

  await prisma.user.updateMany({
    where: { id: { in: allowed.map((t) => t.id) } },
    data: { disabled: nextDisabled },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: nextDisabled ? "user.bulk.disable" : "user.bulk.enable",
    metadata: { count: allowed.length, userIds: allowed.map((t) => t.id) },
  });

  revalidatePath("/admin/users");
}

const bulkEnrollSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  courseId: z.string().min(1),
});

export async function bulkEnroll(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = bulkEnrollSchema.safeParse({
    userIds: parseUserIds(formData),
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (!course || course.organizationId !== admin.organizationId) {
    throw new Error("forbidden");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: parsed.data.userIds }, organizationId: admin.organizationId },
    select: { id: true },
  });

  await prisma.$transaction(
    users.map((u) =>
      prisma.enrollment.upsert({
        where: { userId_courseId: { userId: u.id, courseId: course.id } },
        update: { status: "active" },
        create: { userId: u.id, courseId: course.id, status: "active" },
      }),
    ),
  );

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "user.bulk.enroll",
    target: course.id,
    metadata: { count: users.length, courseId: course.id, userIds: users.map((u) => u.id) },
  });

  revalidatePath("/admin/users");
}
