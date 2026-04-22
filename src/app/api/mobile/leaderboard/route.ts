import { prisma } from "@/lib/db";
import { authenticateMobileRequest, mobileJson } from "@/lib/mobile-auth";
import type { LeaderboardEntry, LeaderboardResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req);
  if (!auth.ok) return mobileJson({ error: auth.error }, { status: auth.status });

  const orgId = auth.user.organizationId;

  const grouped = await prisma.xpEvent.groupBy({
    by: ["userId"],
    where: { user: { organizationId: orgId } },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
  });

  if (grouped.length === 0) {
    const body: LeaderboardResponse = { top: [], self: null };
    return mobileJson(body);
  }

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const uMap = new Map(users.map((u) => [u.id, u]));

  const ranked: LeaderboardEntry[] = [];
  grouped.forEach((g, i) => {
    const u = uMap.get(g.userId);
    if (!u) return;
    ranked.push({
      userId: u.id,
      name: u.name,
      email: u.email,
      totalXp: g._sum.delta ?? 0,
      rank: i + 1,
      isSelf: u.id === auth.user.id,
    });
  });

  const top = ranked.slice(0, 10);
  const self = ranked.find((r) => r.isSelf) ?? null;

  const body: LeaderboardResponse = { top, self };
  return mobileJson(body);
}
