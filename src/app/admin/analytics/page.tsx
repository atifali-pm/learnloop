import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import {
  getCompletionFunnel,
  getDau,
  getRetention,
  getTopLearners,
} from "@/lib/analytics";
import { DauChart, FunnelChart } from "./_charts";

export default async function AnalyticsPage() {
  const admin = await requireRole("admin");
  const orgId = admin.organizationId;

  const [dau, funnel, top, retention] = await Promise.all([
    getDau({ organizationId: orgId, days: 30 }),
    getCompletionFunnel({ organizationId: orgId }),
    getTopLearners({ organizationId: orgId, limit: 10 }),
    getRetention({ organizationId: orgId }),
  ]);

  const totalDau = dau.reduce((n, p) => n + p.activeUsers, 0);
  const avgDau = dau.length > 0 ? (totalDau / dau.length).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex gap-3 text-xs">
          <Link
            href="/admin/exports/progress.csv"
            className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ↓ Progress CSV
          </Link>
        </div>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Daily active users · last 30 days</h2>
          <span className="text-xs text-zinc-500">avg {avgDau} / day</span>
        </div>
        <div className="mt-3">
          <DauChart data={dau} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Completion funnel</h2>
          <span className="text-xs text-zinc-500">{funnel.courseTitle}</span>
        </div>
        {funnel.buckets.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No published course yet.</p>
        ) : (
          <div className="mt-3">
            <FunnelChart data={funnel.buckets} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium">Top 10 learners by XP</h2>
        <ol className="flex flex-col gap-1">
          {top.map((l, i) => (
            <li
              key={l.userId}
              className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <Link href={`/admin/users/${l.userId}`} className="flex items-center gap-3">
                <span className="w-6 text-xs text-zinc-500">#{i + 1}</span>
                <span>
                  <span className="font-medium">{l.name ?? l.email}</span>
                  <span className="ml-2 text-xs text-zinc-500">{l.email}</span>
                </span>
              </Link>
              <span className="text-sm tabular-nums">{l.totalXp} XP</span>
            </li>
          ))}
          {top.length === 0 && (
            <li className="text-sm text-zinc-500">No XP awarded yet.</li>
          )}
        </ol>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium">Retention (enrollment cohorts)</h2>
        {retention.length === 0 ? (
          <p className="text-sm text-zinc-500">Not enough cohorts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Cohort (week of)</th>
                  <th className="px-3 py-2 text-right">Size</th>
                  {retention[0].weeks.map((w) => (
                    <th key={w.week} className="px-3 py-2 text-right">
                      W{w.week}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {retention.map((r) => (
                  <tr key={r.cohortWeekStart}>
                    <td className="px-3 py-2 font-mono text-xs">{r.cohortWeekStart}</td>
                    <td className="px-3 py-2 text-right">{r.cohortSize}</td>
                    {r.weeks.map((w) => {
                      const pct =
                        r.cohortSize === 0 ? 0 : Math.round((w.active / r.cohortSize) * 100);
                      return (
                        <td key={w.week} className="px-3 py-2 text-right tabular-nums">
                          <span className="text-zinc-500">{w.active}</span>
                          <span className="ml-1 text-xs text-zinc-400">({pct}%)</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
