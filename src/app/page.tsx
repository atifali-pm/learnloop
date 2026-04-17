import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12 sm:py-20">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">LearnLoop</h1>
        {session?.user ? (
          <Link href="/dashboard" className="text-sm underline">
            Dashboard →
          </Link>
        ) : (
          <Link href="/login" className="text-sm underline">
            Sign in →
          </Link>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium sm:text-2xl">Daily habits, measurable progress.</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Multi-tenant gamified learning platform. Earn XP, keep your streak alive, unlock the next level.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <p className="font-medium">Demo accounts</p>
        <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
          <li>learner@demo.test / <code>learner123</code></li>
          <li>instructor@demo.test / <code>instructor123</code></li>
          <li>admin@demo.test / <code>admin123</code></li>
        </ul>
      </section>
    </main>
  );
}
