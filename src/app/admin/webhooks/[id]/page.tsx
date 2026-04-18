import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, assertSameTenant } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { deleteWebhookEndpoint, retryDelivery, toggleWebhookActive } from "../actions";

export default async function WebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole("admin");
  const { id } = await params;

  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
  if (!endpoint) notFound();
  assertSameTenant(admin, endpoint);

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpointId: endpoint.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/webhooks" className="text-sm underline">
        ← Webhooks
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold break-all">{endpoint.url}</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Events: {endpoint.events.join(", ")}
          </p>
        </div>
        <span
          className={
            endpoint.active
              ? "rounded bg-emerald-100 px-2 py-1 text-xs uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "rounded bg-zinc-100 px-2 py-1 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }
        >
          {endpoint.active ? "Active" : "Paused"}
        </span>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Signing secret</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Receivers verify <code>X-LearnLoop-Signature</code> as{" "}
          <code>sha256=HMAC(secret, &quot;{`{timestamp}.{deliveryId}.{body}`}&quot;)</code>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">
          {endpoint.secret}
        </pre>
      </section>

      <section className="flex flex-wrap gap-3">
        <form action={toggleWebhookActive}>
          <input type="hidden" name="endpointId" value={endpoint.id} />
          <input type="hidden" name="active" value={endpoint.active ? "false" : "true"} />
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {endpoint.active ? "Pause" : "Resume"}
          </button>
        </form>
        <form action={deleteWebhookEndpoint}>
          <input type="hidden" name="endpointId" value={endpoint.id} />
          <button
            type="submit"
            className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete endpoint
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Recent deliveries ({deliveries.length})</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Status</th>
                <th className="hidden px-3 py-2 sm:table-cell">Attempts</th>
                <th className="hidden px-3 py-2 md:table-cell">Last error</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {d.createdAt.toISOString().replace("T", " ").slice(0, 19)}Z
                  </td>
                  <td className="px-3 py-2">
                    <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {d.event}
                    </code>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="hidden px-3 py-2 text-xs sm:table-cell">{d.attempts}</td>
                  <td className="hidden px-3 py-2 text-xs text-zinc-500 md:table-cell">
                    {d.lastError ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.status !== "delivered" && (
                      <form action={retryDelivery}>
                        <input type="hidden" name="deliveryId" value={d.id} />
                        <button
                          type="submit"
                          className="text-xs underline"
                        >
                          Retry now
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-zinc-500">
                    No deliveries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", label: "pending" },
    delivered: {
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      label: "delivered",
    },
    failed: { cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", label: "failed" },
    abandoned: { cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", label: "abandoned" },
  };
  const m = map[status] ?? map.pending;
  return (
    <span className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}
