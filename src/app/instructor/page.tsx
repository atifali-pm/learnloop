import { requireRole } from "@/lib/rbac";

export default async function InstructorHome() {
  await requireRole("instructor", "admin");
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Instructor</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Course authoring + cohort views land here in Phase 3.
      </p>
    </main>
  );
}
