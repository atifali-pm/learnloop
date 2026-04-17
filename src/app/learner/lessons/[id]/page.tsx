import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { completeLesson } from "@/lib/gamification/complete";
import { evaluateGating, parseGatingRule } from "@/lib/gamification/gating";
import { revalidatePath } from "next/cache";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; xp?: string; streak?: string; badges?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { done, xp, streak, badges } = await searchParams;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { course: true },
  });

  if (!lesson || lesson.course.organizationId !== user.organizationId) {
    notFound();
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId: user.id, courseId: lesson.courseId },
    },
    include: {
      progress: true,
      course: { include: { lessons: { orderBy: { order: "asc" } } } },
    },
  });

  if (!enrollment) {
    redirect("/learner");
  }

  const completedLessonIds = new Set(
    enrollment.progress.filter((p) => p.completedAt).map((p) => p.lessonId),
  );
  const completedOrders = new Set(
    enrollment.course.lessons
      .filter((l) => completedLessonIds.has(l.id))
      .map((l) => l.order),
  );

  const xpAgg = await prisma.xpEvent.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });
  const currentXp = xpAgg._sum.delta ?? 0;

  const gating = evaluateGating(parseGatingRule(lesson.gatingRule), {
    completedLessonOrders: completedOrders,
    currentXp,
  });

  const alreadyCompleted = completedLessonIds.has(lesson.id);
  const nextLesson = enrollment.course.lessons.find((l) => l.order === lesson.order + 1);

  async function markComplete() {
    "use server";
    const me = await requireUser();
    const result = await completeLesson({ userId: me.id, lessonId: id });
    if (!result.ok) {
      redirect(`/learner/lessons/${id}?done=fail`);
    }
    revalidatePath("/learner");
    const qs = new URLSearchParams({
      done: "ok",
      xp: String(result.xpAwarded),
      streak: String(result.streak.current),
      badges: String(result.badgesAwarded.length),
    });
    redirect(`/learner/lessons/${id}?${qs.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
      <Link href="/learner" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← Back
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {enrollment.course.title} · Lesson {lesson.order}
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
        <p className="text-sm text-zinc-500">Reward · +{lesson.xpReward} XP</p>
      </header>

      {done === "ok" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
          ✓ Completed. +{xp ?? 0} XP · streak {streak ?? 0}
          {Number(badges ?? 0) > 0 && ` · ${badges} new badge${Number(badges) > 1 ? "s" : ""}`}
        </div>
      )}

      {done === "fail" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
          Couldn&apos;t complete this lesson. It may be locked.
        </div>
      )}

      <article className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed">
        <p>{lesson.content ?? "No content yet."}</p>
      </article>

      {!gating.unlocked && !alreadyCompleted ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          🔒 {gating.unlocked ? "" : gating.reason}
        </div>
      ) : (
        <form action={markComplete}>
          <button
            type="submit"
            disabled={alreadyCompleted}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {alreadyCompleted ? "Completed ✓" : "Mark complete"}
          </button>
        </form>
      )}

      {nextLesson && alreadyCompleted && (
        <Link
          href={`/learner/lessons/${nextLesson.id}`}
          className="block rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <p className="text-xs uppercase tracking-wide text-zinc-500">Up next</p>
          <p className="font-medium">
            Lesson {nextLesson.order} · {nextLesson.title}
          </p>
        </Link>
      )}
    </main>
  );
}
