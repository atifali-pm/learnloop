import { prisma } from "@/lib/db";

export type AuditAction =
  | "user.role.change"
  | "user.disable"
  | "user.enable"
  | "course.create"
  | "course.update"
  | "course.publish"
  | "course.unpublish"
  | "course.delete";

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
