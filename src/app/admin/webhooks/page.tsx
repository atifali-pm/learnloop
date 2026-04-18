import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { createWebhookEndpoint } from "./actions";

const EVENT_OPTIONS = [
  { value: "lesson.completed", label: "lesson.completed" },
  { value: "badge.awarded", label: "badge.awarded" },
  { value: "streak.extended", label: "streak.extended" },
];

export default async function WebhooksPage() {
  const admin = await requireRole("admin");

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId: admin.organizationId },
    include: { _count: { select: { deliveries: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-zinc-500">{endpoints.length} endpoints</p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Register an endpoint</h2>
        <form action={createWebhookEndpoint} className="mt-3 flex flex-col gap-3">
          <input
            name="url"
            type="url"
            placeholder="https://example.com/webhooks/learnloop"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="mb-1 text-xs text-zinc-500">Events</legend>
            {EVENT_OPTIONS.map((e) => (
              <label key={e.value} className="flex items-center gap-2">
                <input type="checkbox" name="events" value={e.value} />
                <code className="text-xs">{e.label}</code>
              </label>
            ))}
          </fieldset>
          <div>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Register endpoint
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">Events</th>
              <th className="px-3 py-2">Status</th>
              <th className="hidden px-3 py-2 sm:table-cell">Deliveries</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {endpoints.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-mono text-xs break-all">{e.url}</td>
                <td className="px-3 py-2 text-xs">{e.events.join(", ")}</td>
                <td className="px-3 py-2">
                  {e.active ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                  ) : (
                    <span className="text-zinc-500">Paused</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">{e._count.deliveries}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/webhooks/${e.id}`} className="text-sm underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {endpoints.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No webhook endpoints registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
