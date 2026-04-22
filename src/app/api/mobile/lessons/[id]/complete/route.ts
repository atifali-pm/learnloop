import { z } from "zod";
import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import { completeLesson } from "@/lib/gamification/complete";
import { levelFromXp } from "@/lib/gamification/xp";
import type { CompleteLessonResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    answers: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  let parsedAnswers: Record<string, string> | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const raw = await req.json();
      const parsed = bodySchema.safeParse(raw);
      if (parsed.success) parsedAnswers = parsed.data.answers;
    } catch {
      // Empty / invalid body is OK; quiz gating still applies.
    }
  }

  const { id } = await params;
  const result = await completeLesson({
    userId: auth.user.id,
    lessonId: id,
    answers: parsedAnswers,
  });

  if (!result.ok) {
    const body: CompleteLessonResponse = {
      ok: false,
      reason: result.reason,
      quiz: result.quiz ? { grade: result.quiz.grade } : undefined,
    };
    return mobileJson(body, { status: 400 });
  }

  const { level } = levelFromXp(result.totalXp);

  const body: CompleteLessonResponse = {
    ok: true,
    alreadyCompleted: result.alreadyCompleted,
    xpAwarded: result.xpAwarded,
    totalXp: result.totalXp,
    level,
    streak: result.streak,
    badgesAwarded: result.badgesAwarded,
    quiz: result.quiz ? { grade: result.quiz.grade } : undefined,
  };
  return mobileJson(body);
}
