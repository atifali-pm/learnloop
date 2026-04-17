import { prisma } from "@/lib/db";
import { computeStreak } from "./streaks";
import { evaluateGating, parseGatingRule } from "./gating";
import { evaluateBadges } from "./badges";

export type CompleteLessonResult =
  | {
      ok: true;
      alreadyCompleted: boolean;
      xpAwarded: number;
      totalXp: number;
      streak: { current: number; longest: number };
      badgesAwarded: string[];
    }
  | { ok: false; reason: string };

export async function completeLesson(params: {
  userId: string;
  lessonId: string;
}): Promise<CompleteLessonResult> {
  const { userId, lessonId } = params;

  const [user, lesson] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    }),
  ]);

  if (!user || !lesson) return { ok: false, reason: "Lesson or user not found." };

  if (lesson.course.organizationId !== user.organizationId) {
    return { ok: false, reason: "Lesson not available to this user." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
  });
  if (!enrollment) return { ok: false, reason: "Not enrolled in this course." };

  const [completedLessons, xpAgg] = await Promise.all([
    prisma.progress.findMany({
      where: { enrollmentId: enrollment.id, completedAt: { not: null } },
      include: { lesson: { select: { order: true } } },
    }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { delta: true } }),
  ]);

  const completedOrders = new Set(completedLessons.map((p) => p.lesson.order));
  const currentXp = xpAgg._sum.delta ?? 0;

  const gating = evaluateGating(parseGatingRule(lesson.gatingRule), {
    completedLessonOrders: completedOrders,
    currentXp,
  });
  if (!gating.unlocked) return { ok: false, reason: gating.reason };

  const alreadyCompleted = completedOrders.has(lesson.order);

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.progress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
        },
      },
      update: alreadyCompleted ? {} : { completedAt: now },
      create: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        completedAt: now,
      },
    });

    await tx.activity.create({
      data: {
        userId,
        lessonId: lesson.id,
        type: "lesson_completed",
        verifiedAt: now,
      },
    });

    const xpAwarded = alreadyCompleted ? 0 : lesson.xpReward;
    if (xpAwarded > 0) {
      await tx.xpEvent.create({
        data: {
          userId,
          delta: xpAwarded,
          reason: "lesson_completed",
          metadata: { lessonId: lesson.id },
        },
      });
    }

    const prevStreak = await tx.streak.findUnique({ where: { userId } });
    const nextStreak = computeStreak(
      {
        current: prevStreak?.current ?? 0,
        longest: prevStreak?.longest ?? 0,
        lastActivityUtc: prevStreak?.lastActivityUtc ?? null,
      },
      now,
      user.timezone,
    );

    await tx.streak.upsert({
      where: { userId },
      update: {
        current: nextStreak.current,
        longest: nextStreak.longest,
        lastActivityUtc: now,
      },
      create: {
        userId,
        current: nextStreak.current,
        longest: nextStreak.longest,
        lastActivityUtc: now,
      },
    });

    return { xpAwarded, streak: nextStreak };
  });

  const [totalCompleted, xpAggAfter] = await Promise.all([
    prisma.progress.count({
      where: { enrollmentId: enrollment.id, completedAt: { not: null } },
    }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { delta: true } }),
  ]);

  const totalXp = xpAggAfter._sum.delta ?? 0;

  const badgesAwarded = await evaluateBadges({
    userId,
    organizationId: user.organizationId,
    stats: {
      xp: totalXp,
      currentStreak: result.streak.current,
      lessonsCompleted: totalCompleted,
    },
  });

  return {
    ok: true,
    alreadyCompleted,
    xpAwarded: result.xpAwarded,
    totalXp,
    streak: { current: result.streak.current, longest: result.streak.longest },
    badgesAwarded,
  };
}
