import { prisma } from "@/lib/db";
import { computeStreak } from "./streaks";
import { evaluateGating, parseGatingRule } from "./gating";
import { evaluateBadges } from "./badges";
import { enqueueWebhookEvent } from "@/lib/webhooks/queue";
import { gradeQuiz, parseQuiz, type QuizAnswers, type QuizGradeResult } from "./quiz";

export type CompleteLessonResult =
  | {
      ok: true;
      alreadyCompleted: boolean;
      xpAwarded: number;
      totalXp: number;
      streak: { current: number; longest: number };
      badgesAwarded: string[];
      quiz?: { grade: QuizGradeResult };
    }
  | { ok: false; reason: string; quiz?: { grade: QuizGradeResult } };

export async function completeLesson(params: {
  userId: string;
  lessonId: string;
  answers?: QuizAnswers;
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

  // If the lesson has a quiz, require all-correct answers before granting credit.
  // Skip the check on re-completion since the lesson is already marked done.
  const quiz = parseQuiz(lesson.quiz);
  let quizGrade: QuizGradeResult | undefined;
  if (quiz && !alreadyCompleted) {
    const answers = params.answers ?? {};
    quizGrade = gradeQuiz(quiz, answers);
    if (!quizGrade.allCorrect) {
      return {
        ok: false,
        reason: `Got ${quizGrade.correctCount} of ${quizGrade.totalCount} correct. Review the lesson and try again.`,
        quiz: { grade: quizGrade },
      };
    }
  }

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

  if (!alreadyCompleted) {
    await enqueueWebhookEvent({
      organizationId: user.organizationId,
      event: "lesson.completed",
      payload: {
        userId,
        userEmail: user.email,
        lessonId: lesson.id,
        lessonOrder: lesson.order,
        lessonTitle: lesson.title,
        courseId: lesson.courseId,
        xpAwarded: result.xpAwarded,
        totalXp,
        currentStreak: result.streak.current,
        completedAt: now.toISOString(),
      },
    });

    if (result.streak.current > (result.streak.broken ? 1 : 0) && !result.streak.alreadyCountedToday) {
      await enqueueWebhookEvent({
        organizationId: user.organizationId,
        event: "streak.extended",
        payload: {
          userId,
          userEmail: user.email,
          current: result.streak.current,
          longest: result.streak.longest,
          at: now.toISOString(),
        },
      });
    }

    if (badgesAwarded.length > 0) {
      const badgeRows = await prisma.badge.findMany({
        where: { id: { in: badgesAwarded } },
        select: { id: true, slug: true, name: true },
      });
      for (const b of badgeRows) {
        await enqueueWebhookEvent({
          organizationId: user.organizationId,
          event: "badge.awarded",
          payload: {
            userId,
            userEmail: user.email,
            badgeId: b.id,
            badgeSlug: b.slug,
            badgeName: b.name,
            awardedAt: now.toISOString(),
          },
        });
      }
    }
  }

  return {
    ok: true,
    alreadyCompleted,
    xpAwarded: result.xpAwarded,
    totalXp,
    streak: { current: result.streak.current, longest: result.streak.longest },
    badgesAwarded,
    quiz: quizGrade ? { grade: quizGrade } : undefined,
  };
}
