import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, assertSameTenant } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { setCoursePublished, updateCourse } from "../actions";
import {
  createLesson,
  deleteLesson,
  reorderLesson,
  updateLesson,
} from "./lessons/actions";

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
          <p className="text-sm text-zinc-500">
            {course.slug} · {course._count.enrollments} enrolled
          </p>
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
        <h2 className="text-sm font-medium">Add a lesson</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Added to the end of the list. Use the ↑/↓ buttons below to re-order.
        </p>
        <form action={createLesson} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="courseId" value={course.id} />
          <input
            name="title"
            placeholder="Lesson title"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <label className="flex flex-col gap-1 text-xs">
            XP reward
            <input
              name="xpReward"
              type="number"
              min={0}
              max={1000}
              defaultValue={10}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Gating rule JSON (optional)
            <input
              name="gatingRule"
              placeholder='{"requiresLessonOrder":1}'
              className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <textarea
            name="content"
            placeholder="Lesson content (Markdown OK; rendered as plain text for now)"
            rows={3}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add lesson
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Lessons ({course.lessons.length})</h2>
        <ol className="flex flex-col gap-3">
          {course.lessons.map((l, idx) => (
            <li key={l.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-zinc-500">#{l.order}</span>
                <div className="flex gap-1">
                  {idx > 0 && (
                    <form action={reorderLesson}>
                      <input type="hidden" name="lessonId" value={l.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className="text-xs underline" aria-label="Move up">
                        ↑
                      </button>
                    </form>
                  )}
                  {idx < course.lessons.length - 1 && (
                    <form action={reorderLesson}>
                      <input type="hidden" name="lessonId" value={l.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" className="text-xs underline" aria-label="Move down">
                        ↓
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <form action={updateLesson} className="mt-2 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="lessonId" value={l.id} />
                <input
                  name="title"
                  defaultValue={l.title}
                  required
                  className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <label className="flex flex-col gap-1 text-xs">
                  XP
                  <input
                    name="xpReward"
                    type="number"
                    min={0}
                    max={1000}
                    defaultValue={l.xpReward}
                    className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Gating rule JSON
                  <input
                    name="gatingRule"
                    defaultValue={JSON.stringify(l.gatingRule ?? {})}
                    className="rounded border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <textarea
                  name="content"
                  defaultValue={l.content ?? ""}
                  rows={2}
                  className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <div className="flex justify-between sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Save
                  </button>
                </div>
              </form>

              <form action={deleteLesson} className="mt-2">
                <input type="hidden" name="lessonId" value={l.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 underline dark:text-red-400"
                >
                  Delete lesson
                </button>
              </form>
            </li>
          ))}
          {course.lessons.length === 0 && (
            <li className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No lessons yet. Add one above.
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}
