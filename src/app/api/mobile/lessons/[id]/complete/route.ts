import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import { completeLesson } from "@/lib/gamification/complete";
import { levelFromXp } from "@/lib/gamification/xp";
import type { CompleteLessonResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const result = await completeLesson({ userId: auth.user.id, lessonId: id });

  if (!result.ok) {
    const body: CompleteLessonResponse = { ok: false, reason: result.reason };
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
  };
  return mobileJson(body);
}
