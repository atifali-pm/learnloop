import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold">403 — Forbidden</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        You don&apos;t have access to that page.
      </p>
      <Link href="/dashboard" className="underline">
        Back to dashboard
      </Link>
    </main>
  );
}
