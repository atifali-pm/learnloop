import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-sm uppercase tracking-wide text-zinc-500">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        That page doesn&apos;t exist, or you&apos;re not allowed to see it.
      </p>
      <Link href="/" className="underline">
        Back home
      </Link>
    </main>
  );
}
