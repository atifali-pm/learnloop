import { prisma } from "@/lib/db";
import { evaluateGating, parseGatingRule } from "./gating";
import { levelFromXp } from "./xp";

export type LearnerLessonView = {
  id: string;
  order: number;
  title: string;
  xpReward: number;
  completed: boolean;
  unlocked: boolean;
  lockReason?: string;
};

export type LearnerCourseView = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  lessons: LearnerLessonView[];
  nextLesson: LearnerLessonView | null;
};

export type LearnerOverview = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  currentStreak: number;
  longestStreak: number;
  badges: { id: string; slug: string; name: string; awardedAt: Date }[];
  courses: LearnerCourseView[];
};

export async function getLearnerOverview(userId: string): Promise<LearnerOverview> {
  const [enrollments, xpAgg, streak, userBadges] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, status: "active" },
      include: {
        course: {
          include: {
            lessons: { orderBy: { order: "asc" } },
          },
        },
        progress: true,
      },
    }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { delta: true } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }),
  ]);

  const totalXp = xpAgg._sum.delta ?? 0;
  const { level, xpIntoLevel, xpToNext } = levelFromXp(totalXp);

  const courses: LearnerCourseView[] = enrollments.map((e) => {
    const completedLessonIds = new Set(
      e.progress.filter((p) => p.completedAt).map((p) => p.lessonId),
    );
    const completedOrders = new Set(
      e.course.lessons
        .filter((l) => completedLessonIds.has(l.id))
        .map((l) => l.order),
    );

    const lessons: LearnerLessonView[] = e.course.lessons.map((l) => {
      const gating = evaluateGating(parseGatingRule(l.gatingRule), {
        completedLessonOrders: completedOrders,
        currentXp: totalXp,
      });
      const completed = completedLessonIds.has(l.id);
      return {
        id: l.id,
        order: l.order,
        title: l.title,
        xpReward: l.xpReward,
        completed,
        unlocked: gating.unlocked,
        lockReason: gating.unlocked ? undefined : gating.reason,
      };
    });

    const nextLesson =
      lessons.find((l) => !l.completed && l.unlocked) ?? null;

    return {
      courseId: e.courseId,
      courseSlug: e.course.slug,
      courseTitle: e.course.title,
      lessons,
      nextLesson,
    };
  });

  return {
    level,
    totalXp,
    xpIntoLevel,
    xpToNext,
    currentStreak: streak?.current ?? 0,
    longestStreak: streak?.longest ?? 0,
    badges: userBadges.map((ub) => ({
      id: ub.badge.id,
      slug: ub.badge.slug,
      name: ub.badge.name,
      awardedAt: ub.awardedAt,
    })),
    courses,
  };
}
