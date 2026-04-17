import { requireUser } from "@/lib/rbac";

export default async function LearnerHome() {
  const user = await requireUser();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Learner · {user.name ?? user.email}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Lessons, streak counter, and XP bar land here in Phase 2.
      </p>
    </main>
  );
}
