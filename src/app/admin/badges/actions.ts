"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { badgeRuleSchema } from "@/lib/gamification/badges";

const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

const baseSchema = z.object({
  slug: z.string().regex(slugRe, "lowercase, hyphens, 1-64 chars"),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  ruleType: z.enum(["xp", "streak", "lessons"]),
  threshold: z.coerce.number().int().min(0).max(1_000_000),
});

function buildRule(type: "xp" | "streak" | "lessons", threshold: number) {
  return badgeRuleSchema.parse({ type, threshold });
}

export async function createBadge(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = baseSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    ruleType: formData.get("ruleType"),
    threshold: formData.get("threshold"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const existing = await prisma.badge.findUnique({
    where: {
      organizationId_slug: {
        organizationId: admin.organizationId,
        slug: parsed.data.slug,
      },
    },
  });
  if (existing) throw new Error("slug_in_use");

  const rule = buildRule(parsed.data.ruleType, parsed.data.threshold);

  const badge = await prisma.badge.create({
    data: {
      organizationId: admin.organizationId,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      rule,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "badge.create",
    target: badge.id,
    metadata: { slug: badge.slug, name: badge.name, rule },
  });

  revalidatePath("/admin/badges");
}

export async function updateBadge(formData: FormData) {
  const admin = await requireRole("admin");
  const schema = baseSchema.extend({ badgeId: z.string().min(1) });
  const parsed = schema.safeParse({
    badgeId: formData.get("badgeId"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    ruleType: formData.get("ruleType"),
    threshold: formData.get("threshold"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const badge = await prisma.badge.findUnique({ where: { id: parsed.data.badgeId } });
  if (!badge || badge.organizationId !== admin.organizationId) throw new Error("forbidden");

  const before = { slug: badge.slug, name: badge.name, rule: badge.rule };

  await prisma.badge.update({
    where: { id: badge.id },
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      rule: buildRule(parsed.data.ruleType, parsed.data.threshold),
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "badge.update",
    target: badge.id,
    metadata: {
      before,
      after: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        rule: { type: parsed.data.ruleType, threshold: parsed.data.threshold },
      },
    },
  });

  revalidatePath("/admin/badges");
}

export async function deleteBadge(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = z.object({ badgeId: z.string().min(1) }).safeParse({
    badgeId: formData.get("badgeId"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const badge = await prisma.badge.findUnique({ where: { id: parsed.data.badgeId } });
  if (!badge || badge.organizationId !== admin.organizationId) throw new Error("forbidden");

  await prisma.badge.delete({ where: { id: badge.id } });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "badge.delete",
    target: badge.id,
    metadata: { slug: badge.slug, name: badge.name },
  });

  revalidatePath("/admin/badges");
  redirect("/admin/badges");
}
