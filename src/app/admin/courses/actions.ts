"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

const createSchema = z.object({
  slug: z.string().regex(slugRe, "lowercase, hyphens, 1-64 chars"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function createCourse(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = createSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`invalid: ${msg}`);
  }

  const existing = await prisma.course.findUnique({
    where: {
      organizationId_slug: {
        organizationId: admin.organizationId,
        slug: parsed.data.slug,
      },
    },
  });
  if (existing) throw new Error("slug_in_use");

  const course = await prisma.course.create({
    data: {
      organizationId: admin.organizationId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      published: false,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "course.create",
    target: course.id,
    metadata: { slug: course.slug, title: course.title },
  });

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${course.id}`);
}

const updateSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function updateCourse(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = updateSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) throw new Error("invalid_input");

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
  });
  if (!course || course.organizationId !== admin.organizationId) {
    throw new Error("forbidden");
  }

  const before = { title: course.title, description: course.description };
  await prisma.course.update({
    where: { id: course.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "course.update",
    target: course.id,
    metadata: {
      slug: course.slug,
      before,
      after: { title: parsed.data.title, description: parsed.data.description ?? null },
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${course.id}`);
}

const publishSchema = z.object({
  courseId: z.string().min(1),
  publish: z.enum(["true", "false"]),
});

export async function setCoursePublished(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = publishSchema.safeParse({
    courseId: formData.get("courseId"),
    publish: formData.get("publish"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
  });
  if (!course || course.organizationId !== admin.organizationId) {
    throw new Error("forbidden");
  }

  const nextPublished = parsed.data.publish === "true";
  if (course.published === nextPublished) return;

  await prisma.course.update({
    where: { id: course.id },
    data: { published: nextPublished },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: nextPublished ? "course.publish" : "course.unpublish",
    target: course.id,
    metadata: { slug: course.slug, title: course.title },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${course.id}`);
}
