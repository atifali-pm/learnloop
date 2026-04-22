import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { createBadge, deleteBadge, updateBadge } from "./actions";
import { badgeRuleSchema } from "@/lib/gamification/badges";

type BadgeWithCount = Awaited<ReturnType<typeof loadBadges>>[number];

async function loadBadges(organizationId: string) {
  return prisma.badge.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { userBadges: true } } },
  });
}

function parseRule(raw: unknown) {
  const parsed = badgeRuleSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { type: "xp" as const, threshold: 0 };
}

export default async function BadgesPage() {
  const admin = await requireRole("admin");
  const badges = await loadBadges(admin.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Badges</h1>
        <p className="text-sm text-zinc-500">{badges.length} total</p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Create a badge</h2>
        <form action={createBadge} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            name="slug"
            placeholder="slug (e.g. week-streak)"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="name"
            placeholder="Name (e.g. 7-Day Streak)"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <textarea
            name="description"
            placeholder="Short description"
            rows={2}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <label className="flex flex-col gap-1 text-xs">
            Rule type
            <select
              name="ruleType"
              defaultValue="xp"
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="xp">XP threshold</option>
              <option value="streak">Streak threshold</option>
              <option value="lessons">Lessons-completed threshold</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Threshold
            <input
              name="threshold"
              type="number"
              min={0}
              defaultValue={100}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create badge
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Badge</th>
              <th className="px-3 py-2">Rule</th>
              <th className="px-3 py-2">Earned</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {badges.map((b) => (
              <BadgeRow key={b.id} badge={b} />
            ))}
            {badges.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No badges defined yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BadgeRow({ badge }: { badge: BadgeWithCount }) {
  const rule = parseRule(badge.rule);
  return (
    <tr>
      <td className="px-3 py-2">
        <details>
          <summary className="cursor-pointer">
            <span className="font-medium">{badge.name}</span>
            <span className="ml-2 text-xs text-zinc-500">{badge.slug}</span>
          </summary>
          <form action={updateBadge} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="badgeId" value={badge.id} />
            <input
              name="slug"
              defaultValue={badge.slug}
              required
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="name"
              defaultValue={badge.name}
              required
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <textarea
              name="description"
              defaultValue={badge.description ?? ""}
              rows={2}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <select
              name="ruleType"
              defaultValue={rule.type}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="xp">XP</option>
              <option value="streak">Streak</option>
              <option value="lessons">Lessons</option>
            </select>
            <input
              name="threshold"
              type="number"
              defaultValue={rule.threshold}
              min={0}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex justify-between gap-2 sm:col-span-2">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Save
              </button>
            </div>
          </form>
          <form action={deleteBadge} className="mt-2">
            <input type="hidden" name="badgeId" value={badge.id} />
            <button
              type="submit"
              className="text-xs text-red-600 underline dark:text-red-400"
            >
              Delete badge
            </button>
          </form>
        </details>
      </td>
      <td className="px-3 py-2 text-xs">
        <code>{rule.type}</code> ≥ <strong>{rule.threshold}</strong>
      </td>
      <td className="px-3 py-2">{badge._count.userBadges}</td>
      <td className="px-3 py-2">
        <Link href="/admin/audit?action=badge.update" className="text-xs underline">
          history
        </Link>
      </td>
    </tr>
  );
}
