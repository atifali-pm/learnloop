import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { getLearnerOverview } from "@/lib/gamification/learner-view";

export default async function LearnerHome() {
  const user = await requireUser();
  const overview = await getLearnerOverview(user.id);

  const xpPct =
    overview.xpToNext + overview.xpIntoLevel === 0
      ? 0
      : Math.round(
          (overview.xpIntoLevel / (overview.xpIntoLevel + overview.xpToNext)) * 100,
        );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Learner</p>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {user.name ?? user.email}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Dashboard
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <StatCard
          label="Streak"
          value={`${overview.currentStreak}🔥`}
          sub={`Best ${overview.longestStreak}`}
        />
        <StatCard
          label="Level"
          value={`L${overview.level}`}
          sub={`${overview.totalXp} XP`}
        />
        <StatCard
          label="Badges"
          value={`${overview.badges.length}`}
          sub={overview.badges[0]?.name ?? "None yet"}
        />
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Level {overview.level} → {overview.level + 1}
          </span>
          <span className="text-zinc-500">
            {overview.xpIntoLevel} / {overview.xpIntoLevel + overview.xpToNext} XP
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </section>

      {overview.courses.map((course) => (
        <section key={course.courseId} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{course.courseTitle}</h2>
            {course.nextLesson && (
              <Link
                href={`/learner/lessons/${course.nextLesson.id}`}
                className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                Continue →
              </Link>
            )}
          </div>
          <ol className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {course.lessons.map((l) => (
              <li key={l.id}>
                {l.unlocked ? (
                  <Link
                    href={`/learner/lessons/${l.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-medium ${
                        l.completed
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {l.completed ? "✓" : l.order}
                    </span>
                    <span className="flex-1 text-sm">
                      <span className="block font-medium">{l.title}</span>
                      <span className="block text-xs text-zinc-500">
                        +{l.xpReward} XP
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 opacity-60">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-zinc-100 text-sm dark:bg-zinc-900">
                      🔒
                    </span>
                    <span className="flex-1 text-sm">
                      <span className="block font-medium">{l.title}</span>
                      <span className="block text-xs text-zinc-500">
                        {l.lockReason}
                      </span>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}

      {overview.courses.length === 0 && (
        <p className="text-sm text-zinc-500">
          You&apos;re not enrolled in any courses yet.
        </p>
      )}
    </main>
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
    <div className="flex flex-col items-start gap-0.5 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
      <span className="truncate text-xs text-zinc-500">{sub}</span>
    </div>
  );
}
