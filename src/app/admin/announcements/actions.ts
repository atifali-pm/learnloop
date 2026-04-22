"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const baseSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pinnedDays: z.coerce.number().int().min(0).max(60).default(0),
  published: z.enum(["true", "false"]).default("true"),
});

export async function createAnnouncement(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = baseSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinnedDays: formData.get("pinnedDays") ?? "0",
    published: formData.get("published") ?? "true",
  });
  if (!parsed.success) throw new Error("invalid_input");

  const pinnedUntil =
    parsed.data.pinnedDays > 0
      ? new Date(Date.now() + parsed.data.pinnedDays * 24 * 60 * 60 * 1000)
      : null;

  const row = await prisma.announcement.create({
    data: {
      organizationId: admin.organizationId,
      authorUserId: admin.id,
      title: parsed.data.title,
      body: parsed.data.body,
      published: parsed.data.published === "true",
      pinnedUntil,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "announcement.create",
    target: row.id,
    metadata: { title: row.title, pinnedUntil: row.pinnedUntil },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/learner");
}

export async function updateAnnouncement(formData: FormData) {
  const admin = await requireRole("admin");
  const schema = baseSchema.extend({ id: z.string().min(1) });
  const parsed = schema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    pinnedDays: formData.get("pinnedDays") ?? "0",
    published: formData.get("published") ?? "true",
  });
  if (!parsed.success) throw new Error("invalid_input");

  const existing = await prisma.announcement.findUnique({ where: { id: parsed.data.id } });
  if (!existing || existing.organizationId !== admin.organizationId) throw new Error("forbidden");

  const pinnedUntil =
    parsed.data.pinnedDays > 0
      ? new Date(Date.now() + parsed.data.pinnedDays * 24 * 60 * 60 * 1000)
      : null;

  await prisma.announcement.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      published: parsed.data.published === "true",
      pinnedUntil,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "announcement.update",
    target: existing.id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/learner");
}

export async function deleteAnnouncement(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("invalid_input");

  const existing = await prisma.announcement.findUnique({ where: { id: parsed.data.id } });
  if (!existing || existing.organizationId !== admin.organizationId) throw new Error("forbidden");

  await prisma.announcement.delete({ where: { id: existing.id } });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "announcement.delete",
    target: existing.id,
    metadata: { title: existing.title },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/learner");
  redirect("/admin/announcements");
}
