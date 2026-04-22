import { prisma } from "@/lib/db";

export type AuditAction =
  | "user.role.change"
  | "user.disable"
  | "user.enable"
  | "user.bulk.role.change"
  | "user.bulk.disable"
  | "user.bulk.enable"
  | "user.bulk.enroll"
  | "course.create"
  | "course.update"
  | "course.publish"
  | "course.unpublish"
  | "course.delete"
  | "course.owner.change"
  | "lesson.create"
  | "lesson.update"
  | "lesson.reorder"
  | "lesson.delete"
  | "badge.create"
  | "badge.update"
  | "badge.delete"
  | "announcement.create"
  | "announcement.update"
  | "announcement.delete"
  | "org.settings.update";

export async function writeAuditLog(params: {
  organizationId: string;
  actorUserId: string | null;
  action: AuditAction;
  target?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: params.action,
      target: params.target ?? null,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}
