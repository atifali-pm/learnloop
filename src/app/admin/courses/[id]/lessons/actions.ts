"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { gatingRuleSchema } from "@/lib/gamification/gating";

async function loadCourseForAdmin(courseId: string, adminOrgId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.organizationId !== adminOrgId) throw new Error("forbidden");
  return course;
}

async function loadLessonForAdmin(lessonId: string, adminOrgId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson || lesson.course.organizationId !== adminOrgId) throw new Error("forbidden");
  return lesson;
}

function parseGatingForm(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string" || raw.trim() === "") return {};
  try {
    return gatingRuleSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("invalid_gating_rule_json");
  }
}

const createSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(20_000).optional(),
  xpReward: z.coerce.number().int().min(0).max(1000).default(10),
});

export async function createLesson(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = createSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    xpReward: formData.get("xpReward"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const course = await loadCourseForAdmin(parsed.data.courseId, admin.organizationId);
  const gatingRule = parseGatingForm(formData.get("gatingRule"));

  const maxOrder = await prisma.lesson.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const lesson = await prisma.lesson.create({
    data: {
      courseId: course.id,
      order: nextOrder,
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      xpReward: parsed.data.xpReward,
      gatingRule,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "lesson.create",
    target: lesson.id,
    metadata: { courseId: course.id, order: nextOrder, title: lesson.title },
  });

  revalidatePath(`/admin/courses/${course.id}`);
}

const updateSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(20_000).optional(),
  xpReward: z.coerce.number().int().min(0).max(1000),
});

export async function updateLesson(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = updateSchema.safeParse({
    lessonId: formData.get("lessonId"),
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    xpReward: formData.get("xpReward"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const lesson = await loadLessonForAdmin(parsed.data.lessonId, admin.organizationId);
  const gatingRule = parseGatingForm(formData.get("gatingRule"));

  const before = {
    title: lesson.title,
    xpReward: lesson.xpReward,
    gatingRule: lesson.gatingRule,
  };

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      xpReward: parsed.data.xpReward,
      gatingRule,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "lesson.update",
    target: lesson.id,
    metadata: {
      courseId: lesson.courseId,
      before,
      after: { title: parsed.data.title, xpReward: parsed.data.xpReward, gatingRule },
    },
  });

  revalidatePath(`/admin/courses/${lesson.courseId}`);
}

const reorderSchema = z.object({
  lessonId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

export async function reorderLesson(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = reorderSchema.safeParse({
    lessonId: formData.get("lessonId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const lesson = await loadLessonForAdmin(parsed.data.lessonId, admin.organizationId);

  const siblingOrder =
    parsed.data.direction === "up" ? lesson.order - 1 : lesson.order + 1;
  if (siblingOrder < 1) return;

  const sibling = await prisma.lesson.findUnique({
    where: { courseId_order: { courseId: lesson.courseId, order: siblingOrder } },
  });
  if (!sibling) return;

  // Swap orders via a temp value to dodge the unique (courseId, order) constraint.
  await prisma.$transaction([
    prisma.lesson.update({
      where: { id: lesson.id },
      data: { order: -1 },
    }),
    prisma.lesson.update({
      where: { id: sibling.id },
      data: { order: lesson.order },
    }),
    prisma.lesson.update({
      where: { id: lesson.id },
      data: { order: sibling.order },
    }),
  ]);

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "lesson.reorder",
    target: lesson.id,
    metadata: {
      courseId: lesson.courseId,
      from: lesson.order,
      to: sibling.order,
    },
  });

  revalidatePath(`/admin/courses/${lesson.courseId}`);
}

const deleteSchema = z.object({ lessonId: z.string().min(1) });

export async function deleteLesson(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = deleteSchema.safeParse({ lessonId: formData.get("lessonId") });
  if (!parsed.success) throw new Error("invalid_input");

  const lesson = await loadLessonForAdmin(parsed.data.lessonId, admin.organizationId);

  await prisma.lesson.delete({ where: { id: lesson.id } });

  // Close the gap in ordering so the sequence stays 1..N.
  await prisma.$executeRaw`
    UPDATE "Lesson"
       SET "order" = "order" - 1
     WHERE "courseId" = ${lesson.courseId}
       AND "order" > ${lesson.order}
  `;

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "lesson.delete",
    target: lesson.id,
    metadata: {
      courseId: lesson.courseId,
      order: lesson.order,
      title: lesson.title,
    },
  });

  revalidatePath(`/admin/courses/${lesson.courseId}`);
}
