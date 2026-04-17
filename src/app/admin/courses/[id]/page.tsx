import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, assertSameTenant } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { setCoursePublished, updateCourse } from "../actions";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole("admin");
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) notFound();
  assertSameTenant(admin, course);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/courses" className="text-sm underline">
        ← Courses
      </Link>

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="text-sm text-zinc-500">{course.slug}</p>
        </div>
        <span
          className={
            course.published
              ? "rounded bg-emerald-100 px-2 py-1 text-xs uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "rounded bg-zinc-100 px-2 py-1 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }
        >
          {course.published ? "Published" : "Draft"}
        </span>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Details</h2>
        <form action={updateCourse} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="courseId" value={course.id} />
          <label className="flex flex-col gap-1 text-xs">
            Title
            <input
              name="title"
              defaultValue={course.title}
              required
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Description
            <textarea
              name="description"
              defaultValue={course.description ?? ""}
              rows={3}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save details
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Publishing</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Published courses are visible to enrolled learners.
        </p>
        <form action={setCoursePublished} className="mt-3">
          <input type="hidden" name="courseId" value={course.id} />
          <input
            type="hidden"
            name="publish"
            value={course.published ? "false" : "true"}
          />
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {course.published ? "Unpublish" : "Publish"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Lessons ({course.lessons.length})</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Lesson authoring UI arrives in a later phase; lessons are currently seeded.
        </p>
        <ol className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {course.lessons.map((l) => (
            <li key={l.id} className="flex items-baseline justify-between gap-3 py-2">
              <div>
                <span className="mr-2 text-xs text-zinc-500">#{l.order}</span>
                <span className="text-sm">{l.title}</span>
              </div>
              <span className="text-xs text-zinc-500">+{l.xpReward} XP</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
