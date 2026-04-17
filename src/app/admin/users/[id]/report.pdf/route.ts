import { notFound } from "next/navigation";
import { requireRole, assertSameTenant } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { levelFromXp } from "@/lib/gamification/xp";
import { renderReportCardPdf, type ReportCardData } from "@/lib/exports/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireRole("admin");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      organization: true,
      streak: true,
      userBadges: { include: { badge: true }, orderBy: { awardedAt: "asc" } },
      enrollments: {
        include: {
          course: { include: { lessons: { orderBy: { order: "asc" } } } },
          progress: true,
        },
      },
    },
  });
  if (!user) notFound();
  assertSameTenant(admin, user);

  const xpAgg = await prisma.xpEvent.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });
  const totalXp = xpAgg._sum.delta ?? 0;
  const { level } = levelFromXp(totalXp);

  const data: ReportCardData = {
    generatedAt: new Date(),
    orgName: user.organization.name,
    user: { name: user.name, email: user.email },
    totalXp,
    level,
    currentStreak: user.streak?.current ?? 0,
    longestStreak: user.streak?.longest ?? 0,
    badges: user.userBadges.map((ub) => ({
      name: ub.badge.name,
      awardedAt: ub.awardedAt,
    })),
    courses: user.enrollments.map((e) => {
      const completed = new Map(
        e.progress.filter((p) => p.completedAt).map((p) => [p.lessonId, p.completedAt!]),
      );
      return {
        title: e.course.title,
        lessons: e.course.lessons.map((l) => ({
          order: l.order,
          title: l.title,
          completedAt: completed.get(l.id) ?? null,
        })),
      };
    }),
  };

  const stream = await renderReportCardPdf(data);
  const filename = `report-${user.email.replace(/[^a-z0-9]+/gi, "-")}-${data.generatedAt
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
