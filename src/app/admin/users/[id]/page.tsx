import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, assertSameTenant } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { changeUserRole, toggleUserDisabled } from "../actions";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole("admin");
  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      streak: true,
      _count: {
        select: { enrollments: true, xpEvents: true, userBadges: true },
      },
    },
  });
  if (!target) notFound();
  assertSameTenant(admin, target);

  const xpAgg = await prisma.xpEvent.aggregate({
    where: { userId: target.id },
    _sum: { delta: true },
  });
  const totalXp = xpAgg._sum.delta ?? 0;

  const isSelf = target.id === admin.id;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="text-sm underline">
        ← Users
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{target.name ?? target.email}</h1>
          <p className="text-sm text-zinc-500">{target.email}</p>
        </div>
        <a
          href={`/admin/users/${target.id}/report.pdf`}
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ↓ Report card PDF
        </a>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Role" value={target.role} />
        <Stat label="XP" value={totalXp} />
        <Stat label="Streak" value={target.streak?.current ?? 0} />
        <Stat label="Badges" value={target._count.userBadges} />
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Change role</h2>
        {isSelf && (
          <p className="mt-1 text-xs text-zinc-500">
            You can&apos;t demote yourself — ask another admin.
          </p>
        )}
        <form action={changeUserRole} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="userId" value={target.id} />
          <select
            name="role"
            defaultValue={target.role}
            disabled={isSelf}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="learner">Learner</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={isSelf}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save role
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Access</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Disabled users can&apos;t sign in.
        </p>
        <form action={toggleUserDisabled} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="userId" value={target.id} />
          <input
            type="hidden"
            name="disabled"
            value={target.disabled ? "false" : "true"}
          />
          <span className="text-sm">
            Currently:{" "}
            <strong className={target.disabled ? "text-red-600" : "text-emerald-600"}>
              {target.disabled ? "Disabled" : "Active"}
            </strong>
          </span>
          <button
            type="submit"
            disabled={isSelf}
            className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {target.disabled ? "Re-enable" : "Disable"}
          </button>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
