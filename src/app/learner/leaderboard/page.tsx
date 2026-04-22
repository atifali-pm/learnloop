import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export default async function LeaderboardPage() {
  const user = await requireUser();

  const grouped = await prisma.xpEvent.groupBy({
    by: ["userId"],
    where: { user: { organizationId: user.organizationId } },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
  });

  const userRows = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, email: true },
  });
  const uMap = new Map(userRows.map((u) => [u.id, u]));

  type Row = {
    userId: string;
    name: string | null;
    email: string;
    totalXp: number;
    rank: number;
    isSelf: boolean;
  };

  const rows: Row[] = [];
  grouped.forEach((g, i) => {
    const u = uMap.get(g.userId);
    if (!u) return;
    rows.push({
      userId: u.id,
      name: u.name,
      email: u.email,
      totalXp: g._sum.delta ?? 0,
      rank: i + 1,
      isSelf: u.id === user.id,
    });
  });

  const top10 = rows.slice(0, 10);
  const selfRow = rows.find((r) => r.isSelf) ?? null;
  const selfInTop10 = top10.some((r) => r.isSelf);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
      <Link href="/learner" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← Back
      </Link>

      <header className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Leaderboard</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Top XP this org</h1>
        </div>
        {selfRow && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            You: #{selfRow.rank} · {selfRow.totalXp} XP
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No XP awarded yet. Complete a lesson to get on the board.
        </div>
      ) : (
        <>
          <ol className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {top10.map((r) => (
              <li
                key={r.userId}
                className={`flex items-center gap-3 px-4 py-3 ${
                  r.isSelf ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                }`}
              >
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                    r.rank === 1
                      ? "bg-amber-500 text-white"
                      : r.rank === 2
                        ? "bg-zinc-400 text-white"
                        : r.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  #{r.rank}
                </span>
                <span className="flex-1 text-sm">
                  <span className="block font-medium">
                    {r.name ?? r.email} {r.isSelf && <span className="text-emerald-700 dark:text-emerald-400">(you)</span>}
                  </span>
                  <span className="block text-xs text-zinc-500">{r.email}</span>
                </span>
                <span className="tabular-nums text-sm font-semibold">{r.totalXp} XP</span>
              </li>
            ))}
          </ol>

          {!selfInTop10 && selfRow && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Your standing</p>
              <p className="mt-1 text-sm">
                You&apos;re <strong>#{selfRow.rank}</strong> of {rows.length} with{" "}
                <strong>{selfRow.totalXp} XP</strong>. Keep going to break the top 10.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
