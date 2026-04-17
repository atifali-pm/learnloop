import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { signOut } from "@/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8 sm:max-w-2xl sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Signed in as</p>
          <p className="font-medium">{user.email}</p>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{user.role}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </header>

      <section className="grid gap-3">
        <Link
          href="/learner"
          className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <p className="font-medium">Learner app</p>
          <p className="text-sm text-zinc-500">Today&apos;s lesson, streak, XP.</p>
        </Link>

        {(user.role === "instructor" || user.role === "admin") && (
          <Link
            href="/instructor"
            className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <p className="font-medium">Instructor tools</p>
            <p className="text-sm text-zinc-500">Manage your courses.</p>
          </Link>
        )}

        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <p className="font-medium">Admin panel</p>
            <p className="text-sm text-zinc-500">Users, courses, analytics, webhooks.</p>
          </Link>
        )}
      </section>
    </main>
  );
}
