import { z } from "zod";
import { prisma } from "@/lib/db";

export const badgeRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("xp"), threshold: z.number().int().nonnegative() }),
  z.object({ type: z.literal("streak"), threshold: z.number().int().nonnegative() }),
  z.object({ type: z.literal("lessons"), threshold: z.number().int().nonnegative() }),
]);

export type BadgeRule = z.infer<typeof badgeRuleSchema>;

export type LearnerStats = {
  xp: number;
  currentStreak: number;
  lessonsCompleted: number;
};

export function matchesBadgeRule(rule: BadgeRule, stats: LearnerStats): boolean {
  switch (rule.type) {
    case "xp":
      return stats.xp >= rule.threshold;
    case "streak":
      return stats.currentStreak >= rule.threshold;
    case "lessons":
      return stats.lessonsCompleted >= rule.threshold;
  }
}

export async function evaluateBadges(params: {
  userId: string;
  organizationId: string;
  stats: LearnerStats;
}): Promise<string[]> {
  const { userId, organizationId, stats } = params;

  const [badges, already] = await Promise.all([
    prisma.badge.findMany({ where: { organizationId } }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    }),
  ]);

  const ownedIds = new Set(already.map((b) => b.badgeId));
  const toAward: string[] = [];

  for (const badge of badges) {
    if (ownedIds.has(badge.id)) continue;
    const parsed = badgeRuleSchema.safeParse(badge.rule);
    if (!parsed.success) continue;
    if (matchesBadgeRule(parsed.data, stats)) toAward.push(badge.id);
  }

  if (toAward.length > 0) {
    await prisma.userBadge.createMany({
      data: toAward.map((badgeId) => ({ userId, badgeId })),
      skipDuplicates: true,
    });
  }

  return toAward;
}
