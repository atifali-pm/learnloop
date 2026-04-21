import { prisma } from "@/lib/db";
import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import { levelFromXp } from "@/lib/gamification/xp";
import type { MeResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  const userId = auth.user.id;

  const [xpAgg, streak, badges] = await Promise.all([
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { delta: true } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }),
  ]);

  const totalXp = xpAgg._sum.delta ?? 0;
  const { level, xpIntoLevel, xpToNext } = levelFromXp(totalXp);

  const body: MeResponse = {
    user: auth.user,
    stats: {
      totalXp,
      level,
      xpIntoLevel,
      xpToNext,
      currentStreak: streak?.current ?? 0,
      longestStreak: streak?.longest ?? 0,
      badgeCount: badges.length,
    },
    badges: badges.map((ub) => ({
      id: ub.badge.id,
      slug: ub.badge.slug,
      name: ub.badge.name,
      description: ub.badge.description,
      awardedAt: ub.awardedAt.toISOString(),
    })),
  };

  return mobileJson(body);
}
