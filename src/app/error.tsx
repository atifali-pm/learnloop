"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side console only; server errors are logged by Next.js and
    // also surfaced via the `digest` shown below.
    console.error("[learnloop] unhandled error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-sm uppercase tracking-wide text-red-500">Error</p>
      <h1 className="text-2xl font-semibold">Something broke.</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Try again — if it keeps happening, the admins will see it in the logs.
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-500">
          Reference: <code>{error.digest}</code>
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Try again
      </button>
    </main>
  );
}
