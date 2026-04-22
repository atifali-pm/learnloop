import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";

const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

async function updateProfile(formData: FormData) {
  "use server";
  const me = await requireUser();
  const schema = z.object({
    name: z.string().max(120).optional(),
    timezone: z.string().min(1).max(64),
  });
  const parsed = schema.safeParse({
    name: (formData.get("name") as string) || undefined,
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    redirect("/learner/settings?err=invalid");
  }

  // Validate timezone: Intl throws on unknown tz.
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: parsed.data!.timezone });
  } catch {
    redirect("/learner/settings?err=bad_tz");
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      name: parsed.data!.name ?? null,
      timezone: parsed.data!.timezone,
    },
  });

  revalidatePath("/learner/settings");
  revalidatePath("/learner");
  redirect("/learner/settings?ok=profile");
}

async function changePassword(formData: FormData) {
  "use server";
  const me = await requireUser();
  const schema = z.object({
    current: z.string().min(1),
    next: z.string().min(8).max(128),
  });
  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) redirect("/learner/settings?err=short_password");

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user?.passwordHash) redirect("/learner/settings?err=no_password");

  const ok = await bcrypt.compare(parsed.data!.current, user.passwordHash);
  if (!ok) redirect("/learner/settings?err=wrong_password");

  const newHash = await bcrypt.hash(parsed.data!.next, 10);
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: newHash },
  });
  redirect("/learner/settings?ok=password");
}

const OK_MESSAGES: Record<string, string> = {
  profile: "Profile updated.",
  password: "Password changed.",
};

const ERR_MESSAGES: Record<string, string> = {
  invalid: "Invalid input.",
  bad_tz: "Timezone not recognized.",
  short_password: "New password must be at least 8 characters.",
  wrong_password: "Current password is incorrect.",
  no_password: "No password set on this account.",
};

export default async function LearnerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const user = await requireUser();
  const db = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const { ok, err } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
      <Link href="/learner" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← Back
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Account</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Settings</h1>
      </header>

      {ok && OK_MESSAGES[ok] && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
          {OK_MESSAGES[ok]}
        </div>
      )}
      {err && ERR_MESSAGES[err] && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
          {ERR_MESSAGES[err]}
        </div>
      )}

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Profile</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Your timezone decides when a streak day rolls over.
        </p>
        <form action={updateProfile} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">Email (read only)</span>
            <input
              value={db.email}
              readOnly
              className="cursor-not-allowed rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">Display name</span>
            <input
              name="name"
              defaultValue={db.name ?? ""}
              maxLength={120}
              placeholder="Your name"
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">Timezone</span>
            <select
              name="timezone"
              defaultValue={db.timezone}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
            >
              {COMMON_TIMEZONES.includes(db.timezone) ? null : (
                <option value={db.timezone}>{db.timezone}</option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Password</h2>
        <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
        <form action={changePassword} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">Current password</span>
            <input
              name="current"
              type="password"
              required
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">New password</span>
            <input
              name="next"
              type="password"
              required
              minLength={8}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Change password
          </button>
        </form>
      </section>
    </main>
  );
}
