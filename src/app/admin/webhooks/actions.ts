"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { generateSecret } from "@/lib/webhooks/signer";
import { processOneDelivery } from "@/lib/webhooks/worker";

const EVENT_OPTIONS = ["lesson.completed", "badge.awarded", "streak.extended"] as const;

const createSchema = z.object({
  url: z.string().url().startsWith("http"),
  events: z.array(z.enum(EVENT_OPTIONS)).min(1),
});

export async function createWebhookEndpoint(formData: FormData) {
  const admin = await requireRole("admin");
  const events = formData.getAll("events").map(String);
  const parsed = createSchema.safeParse({
    url: formData.get("url"),
    events,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`invalid: ${msg}`);
  }

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      organizationId: admin.organizationId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret: generateSecret(),
      active: true,
    },
  });

  revalidatePath("/admin/webhooks");
  redirect(`/admin/webhooks/${endpoint.id}`);
}

const toggleSchema = z.object({
  endpointId: z.string().min(1),
  active: z.enum(["true", "false"]),
});

export async function toggleWebhookActive(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = toggleSchema.safeParse({
    endpointId: formData.get("endpointId"),
    active: formData.get("active"),
  });
  if (!parsed.success) throw new Error("invalid_input");

  const ep = await prisma.webhookEndpoint.findUnique({ where: { id: parsed.data.endpointId } });
  if (!ep || ep.organizationId !== admin.organizationId) throw new Error("forbidden");

  await prisma.webhookEndpoint.update({
    where: { id: ep.id },
    data: { active: parsed.data.active === "true" },
  });

  revalidatePath("/admin/webhooks");
  revalidatePath(`/admin/webhooks/${ep.id}`);
}

const deleteSchema = z.object({ endpointId: z.string().min(1) });

export async function deleteWebhookEndpoint(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = deleteSchema.safeParse({ endpointId: formData.get("endpointId") });
  if (!parsed.success) throw new Error("invalid_input");

  const ep = await prisma.webhookEndpoint.findUnique({ where: { id: parsed.data.endpointId } });
  if (!ep || ep.organizationId !== admin.organizationId) throw new Error("forbidden");

  await prisma.webhookEndpoint.delete({ where: { id: ep.id } });

  revalidatePath("/admin/webhooks");
  redirect("/admin/webhooks");
}

const retrySchema = z.object({ deliveryId: z.string().min(1) });

export async function retryDelivery(formData: FormData) {
  const admin = await requireRole("admin");
  const parsed = retrySchema.safeParse({ deliveryId: formData.get("deliveryId") });
  if (!parsed.success) throw new Error("invalid_input");

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: parsed.data.deliveryId },
    include: { endpoint: true },
  });
  if (!delivery || delivery.endpoint.organizationId !== admin.organizationId) {
    throw new Error("forbidden");
  }

  await processOneDelivery(delivery.id);
  revalidatePath(`/admin/webhooks/${delivery.endpointId}`);
}
