import { processDueDeliveries } from "@/lib/webhooks/worker";

export const dynamic = "force-dynamic";

/**
 * Drains due webhook deliveries. Protected by a shared secret so a cron
 * service (e.g. Vercel Cron, GitHub Actions) can invoke it without a session.
 * In dev, defaults to "dev-drain-secret".
 */
export async function POST(req: Request) {
  const expected = process.env.WEBHOOK_DRAIN_SECRET ?? "dev-drain-secret";
  const got = req.headers.get("x-drain-secret");
  if (got !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const limit = Math.max(
    1,
    Math.min(100, Number(new URL(req.url).searchParams.get("limit") ?? "20")),
  );
  const results = await processDueDeliveries(limit);

  return Response.json({
    processed: results.length,
    results,
  });
}
