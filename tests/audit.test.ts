import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("audit log helper (integration)", () => {
  it("writes a row scoped to the organization + actor", async () => {
    const org = await prisma.organization.findFirstOrThrow({ where: { slug: "demo" } });
    const admin = await prisma.user.findFirstOrThrow({ where: { email: "admin@demo.test" } });

    const { writeAuditLog } = await import("@/lib/audit");
    const row = await writeAuditLog({
      organizationId: org.id,
      actorUserId: admin.id,
      action: "user.role.change",
      target: "test-target",
      metadata: { from: "learner", to: "instructor" },
    });

    expect(row.id).toBeTruthy();
    expect(row.organizationId).toBe(org.id);
    expect(row.actorUserId).toBe(admin.id);
    expect(row.action).toBe("user.role.change");
    expect(row.metadata).toMatchObject({ from: "learner", to: "instructor" });

    await prisma.auditLog.delete({ where: { id: row.id } });
  });
});
