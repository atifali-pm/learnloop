import "dotenv/config";
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { generateSecret, verifySignature } from "../src/lib/webhooks/signer";
import { completeLesson } from "../src/lib/gamification/complete";
import { processDueDeliveries } from "../src/lib/webhooks/worker";

const prisma = new PrismaClient();

type ReceivedHit = {
  status: number;
  headers: Record<string, string>;
  body: string;
  valid: boolean;
};

async function main() {
  const received: ReceivedHit[] = [];
  let secret = "";

  // 1. Spin up a receiver that 500s on the first hit, then 200s.
  let hitCount = 0;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      hitCount++;
      const willFail = hitCount === 1;
      const headers = Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? ""]),
      );
      const valid = secret
        ? verifySignature({
            secret,
            deliveryId: headers["x-learnloop-delivery"] ?? "",
            timestamp: headers["x-learnloop-timestamp"] ?? "",
            body,
            signature: headers["x-learnloop-signature"] ?? "",
          })
        : false;

      received.push({ status: willFail ? 500 : 200, headers, body, valid });

      res.statusCode = willFail ? 500 : 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: !willFail }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("bad address");
  const receiverUrl = `http://127.0.0.1:${address.port}/hook`;
  console.log(`receiver listening at ${receiverUrl}`);

  // 2. Register endpoint for the demo org.
  const org = await prisma.organization.findFirstOrThrow({ where: { slug: "demo" } });
  secret = generateSecret();
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      organizationId: org.id,
      url: receiverUrl,
      events: ["lesson.completed", "badge.awarded", "streak.extended"],
      secret,
      active: true,
    },
  });
  console.log(`endpoint ${endpoint.id} registered`);

  // 3. Complete a lesson as the demo learner — triggers the webhook fan-out.
  const learner = await prisma.user.findUniqueOrThrow({ where: { email: "learner@demo.test" } });
  const course = await prisma.course.findFirstOrThrow({
    where: { slug: "habit-loop-101" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  const completion = await completeLesson({
    userId: learner.id,
    lessonId: course.lessons[0].id,
  });
  console.log("completion:", completion);

  // 4. Drain pending deliveries (first hit 500s → retry scheduled, second should succeed).
  const first = await processDueDeliveries();
  console.log(`drain 1: ${first.length} processed`);
  first.forEach((r) => console.log(`  ${r.deliveryId} -> ${r.status} ${r.httpStatus ?? ""} ${r.error ?? ""}`));

  // Force the retry to be due now so we don't have to wait the backoff.
  await prisma.webhookDelivery.updateMany({
    where: { endpointId: endpoint.id, status: "failed" },
    data: { nextAttempt: new Date() },
  });

  const second = await processDueDeliveries();
  console.log(`drain 2: ${second.length} processed`);
  second.forEach((r) => console.log(`  ${r.deliveryId} -> ${r.status} ${r.httpStatus ?? ""}`));

  console.log(`\nreceiver saw ${received.length} hits:`);
  received.forEach((h, i) =>
    console.log(
      `  #${i + 1}: status=${h.status} event=${h.headers["x-learnloop-event"]} sigValid=${h.valid}`,
    ),
  );

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpointId: endpoint.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nfinal delivery rows (${deliveries.length}):`);
  deliveries.forEach((d) =>
    console.log(
      `  event=${d.event} status=${d.status} attempts=${d.attempts} err=${d.lastError ?? "-"}`,
    ),
  );

  // 5. Clean up.
  await prisma.webhookDelivery.deleteMany({ where: { endpointId: endpoint.id } });
  await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  await prisma.xpEvent.deleteMany({ where: { userId: learner.id } });
  await prisma.activity.deleteMany({ where: { userId: learner.id } });
  await prisma.userBadge.deleteMany({ where: { userId: learner.id } });
  await prisma.streak.deleteMany({ where: { userId: learner.id } });
  await prisma.progress.deleteMany({ where: { enrollment: { userId: learner.id } } });

  server.close();
  await prisma.$disconnect();
  console.log("\n(cleaned up)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
