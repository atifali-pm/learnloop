import { prisma } from "@/lib/db";
import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import type { CatalogCourse, CatalogResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  const [allPublished, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: auth.user.organizationId, published: true },
      include: {
        lessons: { select: { xpReward: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { userId: auth.user.id },
      select: { courseId: true },
    }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

  const courses: CatalogCourse[] = allPublished
    .filter((c) => !enrolledCourseIds.has(c.id))
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      lessonCount: c.lessons.length,
      totalXp: c.lessons.reduce((sum, l) => sum + l.xpReward, 0),
    }));

  const body: CatalogResponse = { courses };
  return mobileJson(body);
}
