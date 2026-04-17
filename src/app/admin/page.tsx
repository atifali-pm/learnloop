import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export default async function AdminOverview() {
  const user = await requireRole("admin");
  const orgId = user.organizationId;

  const [userCount, activeUsers, courseCount, publishedCourses, lessonsCompleted, xpSum] =
    await Promise.all([
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.user.count({ where: { organizationId: orgId, disabled: false } }),
      prisma.course.count({ where: { organizationId: orgId } }),
      prisma.course.count({ where: { organizationId: orgId, published: true } }),
      prisma.progress.count({
        where: { completedAt: { not: null }, enrollment: { user: { organizationId: orgId } } },
      }),
      prisma.xpEvent.aggregate({
        where: { user: { organizationId: orgId } },
        _sum: { delta: true },
      }),
    ]);

  const stats = [
    { label: "Users", value: userCount, sub: `${activeUsers} active`, href: "/admin/users" },
    { label: "Courses", value: courseCount, sub: `${publishedCourses} published`, href: "/admin/courses" },
    { label: "Lessons completed", value: lessonsCompleted, sub: "all time" },
    { label: "XP awarded", value: xpSum._sum.delta ?? 0, sub: "all time" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-zinc-500">Organization snapshot.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) =>
          s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.sub}</p>
            </Link>
          ) : (
            <div
              key={s.label}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.sub}</p>
            </div>
          ),
        )}
      </section>
    </div>
  );
}
