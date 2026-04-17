import { prisma } from "@/lib/db";

export async function totalXp(userId: string): Promise<number> {
  const agg = await prisma.xpEvent.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}

export function xpForLevel(level: number): number {
  return 50 * level * (level + 1);
}

export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpToNext: number } {
  let level = 1;
  while (xpForLevel(level) <= xp) level++;
  const floor = xpForLevel(level - 1);
  const ceiling = xpForLevel(level);
  return {
    level,
    xpIntoLevel: xp - floor,
    xpToNext: ceiling - xp,
  };
}
