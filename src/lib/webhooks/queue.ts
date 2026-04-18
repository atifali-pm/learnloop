import { prisma } from "@/lib/db";

export type WebhookEvent = "lesson.completed" | "badge.awarded" | "streak.extended";

export async function enqueueWebhookEvent(params: {
  organizationId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}): Promise<number> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId: params.organizationId,
      active: true,
      events: { has: params.event },
    },
  });

  if (endpoints.length === 0) return 0;

  const rows = endpoints.map((e) => ({
    endpointId: e.id,
    event: params.event,
    payload: params.payload as object,
    status: "pending" as const,
    nextAttempt: new Date(),
  }));

  const result = await prisma.webhookDelivery.createMany({ data: rows });
  return result.count;
}
