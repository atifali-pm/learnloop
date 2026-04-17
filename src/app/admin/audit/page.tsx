import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const admin = await requireRole("admin");
  const { action } = await searchParams;

  const entries = await prisma.auditLog.findMany({
    where: {
      organizationId: admin.organizationId,
      ...(action ? { action } : {}),
    },
    include: { actor: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const distinctActions = await prisma.auditLog.groupBy({
    where: { organizationId: admin.organizationId },
    by: ["action"],
    _count: true,
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-zinc-500">{entries.length} most recent</p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <label className="flex flex-col gap-1 text-xs">
          Action
          <select
            name="action"
            defaultValue={action ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All actions ({distinctActions.reduce((n, a) => n + a._count, 0)})</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action} ({a._count})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="hidden px-3 py-2 sm:table-cell">Target</th>
              <th className="hidden px-3 py-2 md:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {e.createdAt.toISOString().replace("T", " ").slice(0, 19)}Z
                </td>
                <td className="px-3 py-2">
                  {e.actor ? (
                    <>
                      <div className="font-medium">{e.actor.name ?? e.actor.email}</div>
                      <div className="text-xs text-zinc-500">{e.actor.email}</div>
                    </>
                  ) : (
                    <span className="text-zinc-500">system</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {e.action}
                  </code>
                </td>
                <td className="hidden px-3 py-2 font-mono text-xs sm:table-cell">
                  {e.target ?? "—"}
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <pre className="max-w-md overflow-hidden text-ellipsis whitespace-pre-wrap text-xs text-zinc-500">
                    {JSON.stringify(e.metadata, null, 0)}
                  </pre>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
