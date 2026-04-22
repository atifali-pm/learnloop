import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";

async function enrollAction(formData: FormData) {
  "use server";
  const me = await requireUser();
  const schema = z.object({ courseId: z.string().min(1) });
  const parsed = schema.safeParse({ courseId: formData.get("courseId") });
  if (!parsed.success) throw new Error("invalid_input");

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (!course || course.organizationId !== me.organizationId || !course.published) {
    throw new Error("course_not_available");
  }

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: me.id, courseId: course.id } },
    update: { status: "active" },
    create: { userId: me.id, courseId: course.id, status: "active" },
  });

  revalidatePath("/learner");
  revalidatePath("/learner/catalog");
  redirect("/learner");
}

export default async function CatalogPage() {
  const user = await requireUser();

  const [allPublished, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: user.organizationId, published: true },
      include: { lessons: { select: { xpReward: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true },
    }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const available = allPublished.filter((c) => !enrolledIds.has(c.id));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
      <Link href="/learner" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← Back
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Browse</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Course catalog</h1>
        <p className="text-sm text-zinc-500">
          {available.length === 0
            ? "You're enrolled in every published course."
            : `${available.length} course${available.length === 1 ? "" : "s"} available to join`}
        </p>
      </header>

      {available.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nothing new right now. Check back when an instructor publishes another course.
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {available.map((c) => {
            const totalXp = c.lessons.reduce((s, l) => s + l.xpReward, 0);
            return (
              <li
                key={c.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <h2 className="text-base font-semibold">{c.title}</h2>
                {c.description && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  {c.lessons.length} lessons · up to {totalXp} XP
                </p>
                <form action={enrollAction} className="mt-3">
                  <input type="hidden" name="courseId" value={c.id} />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                  >
                    Enroll
                  </button>
                </form>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
