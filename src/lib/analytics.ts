import { prisma } from "@/lib/db";

export type DauPoint = { date: string; activeUsers: number };

export async function getDau(params: {
  organizationId: string;
  days?: number;
}): Promise<DauPoint[]> {
  const days = params.days ?? 30;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await prisma.$queryRaw<{ date: Date; active: bigint }[]>`
    SELECT date_trunc('day', a."createdAt")::date AS date,
           COUNT(DISTINCT a."userId")::bigint AS active
    FROM "Activity" a
    JOIN "User" u ON u.id = a."userId"
    WHERE u."organizationId" = ${params.organizationId}
      AND a."createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const map = new Map<string, number>(
    rows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.active)]),
  );

  const out: DauPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, activeUsers: map.get(key) ?? 0 });
  }
  return out;
}

export type FunnelBucket = {
  lessonId: string;
  order: number;
  title: string;
  completed: number;
};

export async function getCompletionFunnel(params: {
  organizationId: string;
  courseId?: string;
}): Promise<{ courseTitle: string; buckets: FunnelBucket[] }> {
  const course = params.courseId
    ? await prisma.course.findFirst({
        where: { id: params.courseId, organizationId: params.organizationId },
        include: { lessons: { orderBy: { order: "asc" } } },
      })
    : await prisma.course.findFirst({
        where: { organizationId: params.organizationId, published: true },
        orderBy: { createdAt: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      });

  if (!course) return { courseTitle: "—", buckets: [] };

  const counts = await prisma.progress.groupBy({
    by: ["lessonId"],
    where: {
      lessonId: { in: course.lessons.map((l) => l.id) },
      completedAt: { not: null },
    },
    _count: { _all: true },
  });

  const countMap = new Map(counts.map((c) => [c.lessonId, c._count._all]));

  return {
    courseTitle: course.title,
    buckets: course.lessons.map((l) => ({
      lessonId: l.id,
      order: l.order,
      title: l.title,
      completed: countMap.get(l.id) ?? 0,
    })),
  };
}

export type TopLearner = {
  userId: string;
  name: string | null;
  email: string;
  totalXp: number;
};

export async function getTopLearners(params: {
  organizationId: string;
  limit?: number;
}): Promise<TopLearner[]> {
  const limit = params.limit ?? 10;

  const grouped = await prisma.xpEvent.groupBy({
    by: ["userId"],
    where: { user: { organizationId: params.organizationId } },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, email: true },
  });
  const uMap = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = uMap.get(g.userId);
      if (!u) return null;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        totalXp: g._sum.delta ?? 0,
      };
    })
    .filter((x): x is TopLearner => x !== null);
}

export type RetentionCell = {
  cohortWeekStart: string;
  cohortSize: number;
  weeks: { week: number; active: number }[];
};

function weekStart(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = out.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}

export async function getRetention(params: {
  organizationId: string;
  cohortCount?: number;
  maxWeeks?: number;
}): Promise<RetentionCell[]> {
  const cohortCount = params.cohortCount ?? 4;
  const maxWeeks = params.maxWeeks ?? 4;

  const enrollments = await prisma.enrollment.findMany({
    where: { user: { organizationId: params.organizationId } },
    include: { user: { select: { id: true } } },
  });
  if (enrollments.length === 0) return [];

  const cohortMap = new Map<string, Set<string>>();
  for (const e of enrollments) {
    const key = weekStart(e.startedAt).toISOString().slice(0, 10);
    if (!cohortMap.has(key)) cohortMap.set(key, new Set());
    cohortMap.get(key)!.add(e.user.id);
  }

  const sortedCohorts = [...cohortMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, cohortCount);

  if (sortedCohorts.length === 0) return [];

  const userIds = new Set<string>();
  for (const [, users] of sortedCohorts) users.forEach((u) => userIds.add(u));

  const activities = await prisma.activity.findMany({
    where: { userId: { in: [...userIds] } },
    select: { userId: true, createdAt: true },
  });

  const userWeeks = new Map<string, Set<string>>();
  for (const a of activities) {
    const key = weekStart(a.createdAt).toISOString().slice(0, 10);
    if (!userWeeks.has(a.userId)) userWeeks.set(a.userId, new Set());
    userWeeks.get(a.userId)!.add(key);
  }

  return sortedCohorts.map(([cohortKey, users]) => {
    const weeks: { week: number; active: number }[] = [];
    const cohortDate = new Date(cohortKey + "T00:00:00Z");
    for (let w = 0; w < maxWeeks; w++) {
      const target = new Date(cohortDate);
      target.setUTCDate(target.getUTCDate() + w * 7);
      const targetKey = target.toISOString().slice(0, 10);
      let active = 0;
      for (const uid of users) {
        if (userWeeks.get(uid)?.has(targetKey)) active++;
      }
      weeks.push({ week: w, active });
    }
    return {
      cohortWeekStart: cohortKey,
      cohortSize: users.size,
      weeks,
    };
  });
}
