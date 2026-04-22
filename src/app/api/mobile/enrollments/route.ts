import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import type { EnrollResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ courseId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return mobileJson({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return mobileJson({ error: "invalid_input" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (
    !course ||
    course.organizationId !== auth.user.organizationId ||
    !course.published
  ) {
    return mobileJson({ error: "course_not_available" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId: auth.user.id, courseId: course.id },
    },
  });
  if (existing) {
    const response: EnrollResponse = {
      ok: true,
      enrollmentId: existing.id,
      courseId: course.id,
    };
    return mobileJson(response);
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      userId: auth.user.id,
      courseId: course.id,
      status: "active",
    },
  });

  const response: EnrollResponse = {
    ok: true,
    enrollmentId: enrollment.id,
    courseId: course.id,
  };
  return mobileJson(response);
}
