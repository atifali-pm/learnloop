import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      uptimeMs: process.uptime() * 1000,
      db: { ok: true, latencyMs: Date.now() - startedAt },
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown";
    return Response.json(
      {
        status: "degraded",
        db: { ok: false, error: err },
      },
      { status: 503 },
    );
  }
}
