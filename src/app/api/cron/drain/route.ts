import { processDueDeliveries } from "@/lib/webhooks/worker";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron invokes this with an `Authorization: Bearer $CRON_SECRET`
 * header, which Vercel sets from the project env. We require the same secret
 * here so an external caller can't drain the queue.
 *
 * Vercel Cron jobs are GET by convention.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return new Response("forbidden", { status: 403 });
    }
  }

  const limit = Math.max(
    1,
    Math.min(100, Number(new URL(req.url).searchParams.get("limit") ?? "20")),
  );
  const results = await processDueDeliveries(limit);

  return Response.json({
    processed: results.length,
    delivered: results.filter((r) => r.status === "delivered").length,
    retry: results.filter((r) => r.status === "retry").length,
    abandoned: results.filter((r) => r.status === "abandoned").length,
  });
}
