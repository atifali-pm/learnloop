import { prisma } from "@/lib/db";
import { signPayload } from "./signer";

const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_SECONDS = 30;

function jitter(ms: number): number {
  return Math.floor(ms * (0.5 + Math.random()));
}

function nextBackoff(attempts: number): Date {
  const exp = Math.min(2 ** attempts, 2 ** 8); // cap the exponent
  const base = BASE_BACKOFF_SECONDS * exp * 1000;
  return new Date(Date.now() + jitter(base));
}

export type DeliveryResult = {
  deliveryId: string;
  status: "delivered" | "retry" | "abandoned";
  httpStatus?: number;
  error?: string;
};

export async function processOneDelivery(deliveryId: string): Promise<DeliveryResult> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery) {
    return { deliveryId, status: "abandoned", error: "not_found" };
  }
  if (delivery.status === "delivered") {
    return { deliveryId, status: "delivered", httpStatus: 200 };
  }
  if (delivery.status === "abandoned") {
    return { deliveryId, status: "abandoned", error: "already_abandoned" };
  }

  const body = JSON.stringify({
    event: delivery.event,
    deliveryId: delivery.id,
    createdAt: delivery.createdAt.toISOString(),
    data: delivery.payload,
  });

  const headers = signPayload({
    secret: delivery.endpoint.secret,
    event: delivery.event,
    deliveryId: delivery.id,
    body,
  });

  const attempts = delivery.attempts + 1;

  try {
    const res = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "delivered",
          attempts,
          deliveredAt: new Date(),
          lastError: null,
          nextAttempt: null,
        },
      });
      return { deliveryId, status: "delivered", httpStatus: res.status };
    }

    const errText = `HTTP ${res.status}`;
    const giveUp = attempts >= MAX_ATTEMPTS;
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: giveUp ? "abandoned" : "failed",
        attempts,
        lastError: errText,
        nextAttempt: giveUp ? null : nextBackoff(attempts),
      },
    });
    return {
      deliveryId,
      status: giveUp ? "abandoned" : "retry",
      httpStatus: res.status,
      error: errText,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown_error";
    const giveUp = attempts >= MAX_ATTEMPTS;
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: giveUp ? "abandoned" : "failed",
        attempts,
        lastError: err,
        nextAttempt: giveUp ? null : nextBackoff(attempts),
      },
    });
    return {
      deliveryId,
      status: giveUp ? "abandoned" : "retry",
      error: err,
    };
  }
}

export async function processDueDeliveries(limit = 20): Promise<DeliveryResult[]> {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      OR: [{ nextAttempt: null }, { nextAttempt: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const results: DeliveryResult[] = [];
  for (const d of due) {
    results.push(await processOneDelivery(d.id));
  }
  return results;
}
