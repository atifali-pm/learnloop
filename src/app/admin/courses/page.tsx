import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { createCourse } from "./actions";

export default async function CoursesPage() {
  const admin = await requireRole("admin");

  const courses = await prisma.course.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="text-sm text-zinc-500">{courses.length} total</p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Create a course</h2>
        <form action={createCourse} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            name="slug"
            placeholder="slug (e.g. habit-loop-101)"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="title"
            placeholder="Title"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <textarea
            name="description"
            placeholder="Short description"
            rows={2}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create course
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Status</th>
              <th className="hidden px-3 py-2 sm:table-cell">Lessons</th>
              <th className="hidden px-3 py-2 sm:table-cell">Enrollments</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="px-3 py-2">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-zinc-500">{c.slug}</div>
                </td>
                <td className="px-3 py-2">
                  {c.published ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      Published
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Draft
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">{c._count.lessons}</td>
                <td className="hidden px-3 py-2 sm:table-cell">{c._count.enrollments}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/courses/${c.id}`} className="text-sm underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
