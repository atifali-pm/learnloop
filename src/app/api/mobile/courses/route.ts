import { prisma } from "@/lib/db";
import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import { evaluateGating, parseGatingRule } from "@/lib/gamification/gating";
import type { CoursesResponse, MobileCourse, MobileLesson } from "@learnloop/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  const userId = auth.user.id;

  const [enrollments, xpAgg] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, status: { in: ["active", "completed"] } },
      include: {
        course: {
          include: { lessons: { orderBy: { order: "asc" } } },
        },
        progress: true,
      },
    }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { delta: true } }),
  ]);

  const totalXp = xpAgg._sum.delta ?? 0;

  const courses: MobileCourse[] = enrollments.map((e) => {
    const completedLessonIds = new Set(
      e.progress.filter((p) => p.completedAt).map((p) => p.lessonId),
    );
    const completedOrders = new Set(
      e.course.lessons.filter((l) => completedLessonIds.has(l.id)).map((l) => l.order),
    );

    const lessons: MobileLesson[] = e.course.lessons.map((l) => {
      const gating = evaluateGating(parseGatingRule(l.gatingRule), {
        completedLessonOrders: completedOrders,
        currentXp: totalXp,
      });
      return {
        id: l.id,
        order: l.order,
        title: l.title,
        content: l.content,
        xpReward: l.xpReward,
        completed: completedLessonIds.has(l.id),
        unlocked: gating.unlocked,
        lockReason: gating.unlocked ? null : gating.reason,
      };
    });

    const next = lessons.find((l) => !l.completed && l.unlocked);

    return {
      id: e.courseId,
      slug: e.course.slug,
      title: e.course.title,
      description: e.course.description,
      enrollmentStatus: e.status,
      lessons,
      nextLessonId: next?.id ?? null,
    };
  });

  const body: CoursesResponse = { courses };
  return mobileJson(body);
}
