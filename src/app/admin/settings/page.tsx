"use server";
// Server component, no client code. "use server" at top is documentation only.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

async function updateOrg(formData: FormData) {
  "use server";
  const admin = await requireRole("admin");
  const schema = z.object({
    name: z.string().min(1).max(200),
    defaultTimezone: z.string().min(1).max(64),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    defaultTimezone: formData.get("defaultTimezone"),
  });
  if (!parsed.success) redirect("/admin/settings?err=invalid");

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: parsed.data!.defaultTimezone });
  } catch {
    redirect("/admin/settings?err=bad_tz");
  }

  const before = await prisma.organization.findUnique({
    where: { id: admin.organizationId },
  });
  await prisma.organization.update({
    where: { id: admin.organizationId },
    data: {
      name: parsed.data!.name,
      defaultTimezone: parsed.data!.defaultTimezone,
    },
  });

  await writeAuditLog({
    organizationId: admin.organizationId,
    actorUserId: admin.id,
    action: "org.settings.update",
    target: admin.organizationId,
    metadata: {
      before: { name: before?.name, defaultTimezone: before?.defaultTimezone },
      after: { name: parsed.data!.name, defaultTimezone: parsed.data!.defaultTimezone },
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  redirect("/admin/settings?ok=saved");
}

export default async function OrgSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const admin = await requireRole("admin");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: admin.organizationId } });
  const { ok, err } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Organization settings</h1>
        <p className="text-sm text-zinc-500">
          Applies across every user and course in this tenant.
        </p>
      </header>

      {ok === "saved" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
          Saved.
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
          {err === "bad_tz" ? "Timezone not recognized." : "Invalid input."}
        </div>
      )}

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <form action={updateOrg} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">
            Organization name
            <input
              name="name"
              defaultValue={org.name}
              required
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Slug (read only)
            <input
              value={org.slug}
              readOnly
              className="cursor-not-allowed rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Default timezone (for new users)
            <select
              name="defaultTimezone"
              defaultValue={org.defaultTimezone ?? "UTC"}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
