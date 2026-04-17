import { requireRole } from "@/lib/rbac";

export default async function AdminHome() {
  await requireRole("admin");
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Users, courses, analytics, webhooks — Phase 3 &amp; 4.
      </p>
    </main>
  );
}
