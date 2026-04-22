import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export default async function InstructorHome() {
  const user = await requireRole("instructor", "admin");

  const courses = await prisma.course.findMany({
    where: {
      organizationId: user.organizationId,
      ...(user.role === "instructor" ? { ownerUserId: user.id } : {}),
    },
    include: {
      lessons: { select: { id: true, xpReward: true } },
      enrollments: {
        include: {
          progress: { select: { lessonId: true, completedAt: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalEnrollments = courses.reduce((s, c) => s + c.enrollments.length, 0);
  const totalCompletions = courses.reduce(
    (s, c) =>
      s + c.enrollments.reduce(
        (cs, e) => cs + e.progress.filter((p) => p.completedAt).length,
        0,
      ),
    0,
  );
  const publishedCount = courses.filter((c) => c.published).length;

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Instructor</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {user.name ?? user.email}
            </h1>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
            Dashboard
          </Link>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Courses" value={String(courses.length)} sub={`${publishedCount} published`} />
          <StatCard label="Enrollments" value={String(totalEnrollments)} sub="active learners" />
          <StatCard
            label="Completions"
            value={String(totalCompletions)}
            sub="lessons finished"
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">
            {user.role === "admin" ? "All courses in this org" : "Your courses"}
          </h2>

          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              {user.role === "instructor"
                ? "No courses owned by you yet. Ask an admin to assign you a course."
                : "No courses yet. Create one under Admin → Courses."}
            </div>
          ) : (
            courses.map((c) => {
              const lessonCount = c.lessons.length;
              const enrollmentCount = c.enrollments.length;
              const totalPossible = lessonCount * Math.max(enrollmentCount, 1);
              const actualCompletions = c.enrollments.reduce(
                (s, e) => s + e.progress.filter((p) => p.completedAt).length,
                0,
              );
              const completionPct =
                totalPossible === 0
                  ? 0
                  : Math.round((actualCompletions / totalPossible) * 100);

              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold">{c.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {c.slug} · {lessonCount} lessons · {enrollmentCount} enrolled
                      </p>
                    </div>
                    <span
                      className={
                        c.published
                          ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          : "rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }
                    >
                      {c.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  {enrollmentCount > 0 && (
                    <div className="mt-3">
                      <div className="flex items-baseline justify-between text-xs text-zinc-500">
                        <span>Cohort completion</span>
                        <span>
                          {actualCompletions} / {lessonCount * enrollmentCount} ({completionPct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex gap-3 text-sm">
                    {user.role === "admin" || c.ownerUserId === user.id ? (
                      <Link
                        href={`/admin/courses/${c.id}`}
                        className="text-emerald-700 underline dark:text-emerald-400"
                      >
                        Manage lessons →
                      </Link>
                    ) : (
                      <span className="text-zinc-500">Read only (not owner)</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
