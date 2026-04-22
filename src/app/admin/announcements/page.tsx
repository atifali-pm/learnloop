import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "./actions";

export default async function AnnouncementsPage() {
  const admin = await requireRole("admin");

  const rows = await prisma.announcement.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { email: true, name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="text-sm text-zinc-500">{rows.length} total</p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Post an announcement</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Published ones appear on every learner&apos;s home page. Pin to keep it at the top for a
          fixed number of days.
        </p>
        <form action={createAnnouncement} className="mt-3 flex flex-col gap-3">
          <input
            name="title"
            placeholder="Title"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <textarea
            name="body"
            placeholder="Body (plain text or short markdown)"
            required
            rows={4}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs">
              Pin for (days)
              <input
                name="pinnedDays"
                type="number"
                min={0}
                max={60}
                defaultValue={0}
                className="w-28 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Status
              <select
                name="published"
                defaultValue="true"
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="true">Published</option>
                <option value="false">Draft</option>
              </select>
            </label>
          </div>
          <div>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Post
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">History</h2>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No announcements yet.
          </p>
        ) : (
          rows.map((row) => (
            <details
              key={row.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <summary className="flex cursor-pointer items-baseline justify-between gap-2">
                <span>
                  <span className="font-semibold">{row.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {row.createdAt.toISOString().slice(0, 10)} · by{" "}
                    {row.author?.name ?? row.author?.email ?? "system"}
                  </span>
                </span>
                <span
                  className={
                    row.published
                      ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      : "rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }
                >
                  {row.published ? "Published" : "Draft"}
                  {row.pinnedUntil && row.pinnedUntil > new Date() ? " · Pinned" : ""}
                </span>
              </summary>

              <form action={updateAnnouncement} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="id" value={row.id} />
                <input
                  name="title"
                  defaultValue={row.title}
                  required
                  className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <textarea
                  name="body"
                  defaultValue={row.body}
                  rows={4}
                  required
                  className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    Pin for (days)
                    <input
                      name="pinnedDays"
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={0}
                      className="w-28 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    Status
                    <select
                      name="published"
                      defaultValue={row.published ? "true" : "false"}
                      className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="true">Published</option>
                      <option value="false">Draft</option>
                    </select>
                  </label>
                </div>
                <div>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Save
                  </button>
                </div>
              </form>

              <form action={deleteAnnouncement} className="mt-2">
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="text-xs text-red-600 underline dark:text-red-400">
                  Delete
                </button>
              </form>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
