import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { csvResponse, toCsv } from "@/lib/exports/csv";

export async function GET() {
  const admin = await requireRole("admin");

  const rows = await prisma.progress.findMany({
    where: {
      completedAt: { not: null },
      enrollment: { user: { organizationId: admin.organizationId } },
    },
    include: {
      lesson: { include: { course: { select: { slug: true, title: true } } } },
      enrollment: { include: { user: { select: { email: true, name: true } } } },
    },
    orderBy: { completedAt: "desc" },
  });

  const shaped = rows.map((r) => ({
    user_email: r.enrollment.user.email,
    user_name: r.enrollment.user.name ?? "",
    course_slug: r.lesson.course.slug,
    course_title: r.lesson.course.title,
    lesson_order: r.lesson.order,
    lesson_title: r.lesson.title,
    completed_at_utc: r.completedAt?.toISOString() ?? "",
    score: r.score ?? "",
  }));

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(`learnloop-progress-${today}.csv`, toCsv(shaped));
}
