import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { levelFromXp } from "@/lib/gamification/xp";

type QuickStat = {
  label: string;
  value: string | number;
  sub?: string;
};

async function getLearnerQuickStats(userId: string): Promise<{
  stats: QuickStat[];
  continueHref: string;
  continueTitle: string | null;
}> {
  const [xpAgg, streak, enrollment, badgeCount] = await Promise.all([
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { delta: true } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.enrollment.findFirst({
      where: { userId, status: "active" },
      include: {
        course: { include: { lessons: { orderBy: { order: "asc" } } } },
        progress: true,
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.userBadge.count({ where: { userId } }),
  ]);

  const totalXp = xpAgg._sum.delta ?? 0;
  const { level } = levelFromXp(totalXp);

  let continueHref = "/learner";
  let continueTitle: string | null = null;
  if (enrollment) {
    const completedIds = new Set(
      enrollment.progress.filter((p) => p.completedAt).map((p) => p.lessonId),
    );
    const next = enrollment.course.lessons.find((l) => !completedIds.has(l.id));
    if (next) {
      continueHref = `/learner/lessons/${next.id}`;
      continueTitle = next.title;
    }
  }

  return {
    stats: [
      { label: "Streak", value: `${streak?.current ?? 0}🔥`, sub: `Best ${streak?.longest ?? 0}` },
      { label: "Level", value: `L${level}`, sub: `${totalXp} XP` },
      { label: "Badges", value: badgeCount },
    ],
    continueHref,
    continueTitle,
  };
}

async function getAdminQuickStats(orgId: string): Promise<QuickStat[]> {
  const [userCount, courseCount, lessonsCompleted, xpSum] = await Promise.all([
    prisma.user.count({ where: { organizationId: orgId, disabled: false } }),
    prisma.course.count({ where: { organizationId: orgId, published: true } }),
    prisma.progress.count({
      where: {
        completedAt: { not: null },
        enrollment: { user: { organizationId: orgId } },
      },
    }),
    prisma.xpEvent.aggregate({
      where: { user: { organizationId: orgId } },
      _sum: { delta: true },
    }),
  ]);
  return [
    { label: "Active users", value: userCount },
    { label: "Published courses", value: courseCount },
    { label: "Lessons completed", value: lessonsCompleted },
    { label: "XP awarded", value: xpSum._sum.delta ?? 0 },
  ];
}

async function getInstructorQuickStats(orgId: string): Promise<QuickStat[]> {
  const [published, drafts, enrollments] = await Promise.all([
    prisma.course.count({ where: { organizationId: orgId, published: true } }),
    prisma.course.count({ where: { organizationId: orgId, published: false } }),
    prisma.enrollment.count({
      where: { status: "active", user: { organizationId: orgId } },
    }),
  ]);
  return [
    { label: "Published courses", value: published },
    { label: "Drafts", value: drafts },
    { label: "Active enrollments", value: enrollments },
  ];
}

export default async function DashboardPage() {
  const user = await requireUser();

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const initial = (user.name ?? user.email ?? "L").charAt(0).toUpperCase();

  let learnerData:
    | Awaited<ReturnType<typeof getLearnerQuickStats>>
    | null = null;
  let adminStats: QuickStat[] = [];
  let instructorStats: QuickStat[] = [];

  if (user.role === "learner" || user.role === "admin" || user.role === "instructor") {
    learnerData = await getLearnerQuickStats(user.id);
  }
  if (user.role === "admin") {
    adminStats = await getAdminQuickStats(user.organizationId);
  }
  if (user.role === "instructor" || user.role === "admin") {
    instructorStats = await getInstructorQuickStats(user.organizationId);
  }

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
              L
            </span>
            <span>LearnLoop</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white sm:h-14 sm:w-14">
              {initial}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                {user.role}
              </p>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back"}
              </h1>
              <p className="text-sm text-zinc-500">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      {user.role === "learner" && learnerData && (
        <LearnerView data={learnerData} />
      )}

      {user.role === "instructor" && (
        <InstructorView data={learnerData!} instructorStats={instructorStats} />
      )}

      {user.role === "admin" && (
        <AdminView
          learner={learnerData!}
          adminStats={adminStats}
          instructorStats={instructorStats}
        />
      )}
    </main>
  );
}

function StatCard({ label, value, sub }: QuickStat) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function PrimaryCta({
  href,
  title,
  body,
  eyebrow,
}: {
  href: string;
  title: string;
  body: string;
  eyebrow?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl hover:shadow-emerald-500/30 sm:p-8"
    >
      {eyebrow && (
        <span className="text-xs uppercase tracking-wider text-emerald-100/80">
          {eyebrow}
        </span>
      )}
      <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="max-w-lg text-sm text-emerald-50/90">{body}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
        Open <span className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

function SecondaryCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-xl">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <p className="mt-3 text-sm text-emerald-600 opacity-0 transition group-hover:opacity-100 dark:text-emerald-400">
        Open →
      </p>
    </Link>
  );
}

function LearnerView({ data }: { data: Awaited<ReturnType<typeof getLearnerQuickStats>> }) {
  return (
    <section className="px-4 pb-12 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {data.stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        <PrimaryCta
          eyebrow={data.continueTitle ? "Next up" : "Get started"}
          href={data.continueHref}
          title={data.continueTitle ?? "Open the learner app"}
          body={
            data.continueTitle
              ? "Continue where you left off. Mark it complete to earn XP and keep your streak alive."
              : "Today's lesson, your streak, XP bar, and badges live in the learner app."
          }
        />
      </div>
    </section>
  );
}

function InstructorView({
  data,
  instructorStats,
}: {
  data: Awaited<ReturnType<typeof getLearnerQuickStats>>;
  instructorStats: QuickStat[];
}) {
  return (
    <section className="px-4 pb-12 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {instructorStats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        <PrimaryCta
          eyebrow="Teach"
          href="/instructor"
          title="Open instructor tools"
          body="Manage the courses and lessons you own. Track enrollment and learner activity."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SecondaryCard
            href="/learner"
            icon="🎓"
            title="Learner view"
            body={
              data.continueTitle
                ? `You also have an active enrollment. Next lesson: ${data.continueTitle}.`
                : "See what learners see, with your own streak and XP."
            }
          />
          <SecondaryCard
            href="/admin/courses"
            icon="📚"
            title="Course catalog"
            body="Browse the organization's courses. Edit any course you own."
          />
        </div>
      </div>
    </section>
  );
}

function AdminView({
  learner,
  adminStats,
  instructorStats,
}: {
  learner: Awaited<ReturnType<typeof getLearnerQuickStats>>;
  adminStats: QuickStat[];
  instructorStats: QuickStat[];
}) {
  void instructorStats;
  return (
    <section className="px-4 pb-12 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {adminStats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <PrimaryCta
          eyebrow="Admin"
          href="/admin"
          title="Open the admin panel"
          body="Users, courses, analytics, webhooks, audit log. Everything an operator needs to run the org."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SecondaryCard
            href="/admin/users"
            icon="👥"
            title="Users"
            body="Filter, disable, change roles."
          />
          <SecondaryCard
            href="/admin/courses"
            icon="📚"
            title="Courses"
            body="Create, edit, publish, author lessons."
          />
          <SecondaryCard
            href="/admin/analytics"
            icon="📊"
            title="Analytics"
            body="DAU, funnel, top learners, retention."
          />
          <SecondaryCard
            href="/admin/webhooks"
            icon="🔗"
            title="Webhooks"
            body="Endpoints, deliveries, retry, HMAC secret."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SecondaryCard
            href="/learner"
            icon="🎓"
            title="Learner view"
            body={
              learner.continueTitle
                ? `Your own progress. Next lesson: ${learner.continueTitle}.`
                : "See what a learner sees. You're also enrolled."
            }
          />
          <SecondaryCard
            href="/admin/audit"
            icon="📜"
            title="Audit log"
            body="Every admin mutation, filterable by action."
          />
        </div>
      </div>
    </section>
  );
}
