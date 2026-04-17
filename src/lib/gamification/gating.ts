import { z } from "zod";

export const gatingRuleSchema = z
  .object({
    requiresLessonOrder: z.number().int().positive().optional(),
    requiresXp: z.number().int().nonnegative().optional(),
  })
  .strict();

export type GatingRule = z.infer<typeof gatingRuleSchema>;

export type GatingResult =
  | { unlocked: true }
  | { unlocked: false; reason: string };

export function parseGatingRule(raw: unknown): GatingRule {
  const parsed = gatingRuleSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function evaluateGating(
  rule: GatingRule,
  stats: { completedLessonOrders: ReadonlySet<number>; currentXp: number },
): GatingResult {
  if (
    rule.requiresLessonOrder !== undefined &&
    !stats.completedLessonOrders.has(rule.requiresLessonOrder)
  ) {
    return {
      unlocked: false,
      reason: `Complete lesson ${rule.requiresLessonOrder} to unlock this.`,
    };
  }

  if (rule.requiresXp !== undefined && stats.currentXp < rule.requiresXp) {
    return {
      unlocked: false,
      reason: `Earn ${rule.requiresXp} XP to unlock (you have ${stats.currentXp}).`,
    };
  }

  return { unlocked: true };
}
