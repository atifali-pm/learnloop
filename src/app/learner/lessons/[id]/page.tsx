import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import ReactMarkdown from "react-markdown";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { completeLesson } from "@/lib/gamification/complete";
import { evaluateGating, parseGatingRule } from "@/lib/gamification/gating";
import { parseQuiz, redactQuizForLearner } from "@/lib/gamification/quiz";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    done?: string;
    xp?: string;
    streak?: string;
    badges?: string;
    wrong?: string;
    total?: string;
  }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const search = await searchParams;

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

  const quiz = parseQuiz(lesson.quiz);
  const quizForLearner = quiz ? redactQuizForLearner(quiz) : null;

  async function markComplete(formData: FormData) {
    "use server";
    const me = await requireUser();

    const answers: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("q_") && typeof value === "string") {
        answers[key.slice(2)] = value;
      }
    }

    const result = await completeLesson({
      userId: me.id,
      lessonId: id,
      answers: Object.keys(answers).length > 0 ? answers : undefined,
    });

    if (!result.ok) {
      const wrong = result.quiz?.grade.wrong.length ?? 0;
      const total = result.quiz?.grade.totalCount ?? 0;
      const qs = new URLSearchParams({ done: "fail", wrong: String(wrong), total: String(total) });
      redirect(`/learner/lessons/${id}?${qs.toString()}`);
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

      {search.done === "ok" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
          ✓ Completed. +{search.xp ?? 0} XP · streak {search.streak ?? 0}
          {Number(search.badges ?? 0) > 0 &&
            ` · ${search.badges} new badge${Number(search.badges) > 1 ? "s" : ""}`}
        </div>
      )}

      {search.done === "fail" && Number(search.total ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {search.wrong} of {search.total} wrong. Review the lesson and try again.
        </div>
      )}

      {search.done === "fail" && Number(search.total ?? 0) === 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
          Couldn&apos;t complete this lesson. It may be locked.
        </div>
      )}

      <article className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:font-semibold prose-p:my-3 prose-li:my-1">
        <ReactMarkdown>{lesson.content ?? "No content yet."}</ReactMarkdown>
      </article>

      {!gating.unlocked && !alreadyCompleted ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          🔒 {gating.reason}
        </div>
      ) : (
        <form action={markComplete} className="flex flex-col gap-5">
          {quizForLearner && !alreadyCompleted && (
            <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Quick check
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Answer all to mark this lesson complete.
                </p>
              </div>

              {quizForLearner.questions.map((q, qi) => (
                <fieldset key={q.id} className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">
                    {qi + 1}. {q.prompt}
                  </legend>
                  <div className="flex flex-col gap-1.5">
                    {q.choices.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-start gap-2.5 rounded-md border border-zinc-200 p-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={c.id}
                          required
                          className="mt-0.5"
                        />
                        <span>{c.text}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>
          )}

          <button
            type="submit"
            disabled={alreadyCompleted}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {alreadyCompleted ? "Completed ✓" : quizForLearner ? "Submit answers" : "Mark complete"}
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
