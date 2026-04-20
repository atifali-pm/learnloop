import Link from "next/link";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";

const PREFILL: Record<string, { email: string; password: string }> = {
  learner: { email: "learner@demo.test", password: "learner123" },
  admin: { email: "admin@demo.test", password: "admin123" },
  instructor: { email: "instructor@demo.test", password: "instructor123" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; prefill?: string }>;
}) {
  const { next, error, prefill } = await searchParams;
  const preset = prefill ? PREFILL[prefill.toLowerCase()] : undefined;

  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");
    const target = (formData.get("next") as string) || "/dashboard";

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: target,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "login_failed";
      if (msg === "NEXT_REDIRECT") throw e;
      redirect(`/login?error=invalid&next=${encodeURIComponent(target)}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-6 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← Home
      </Link>

      <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
      {preset ? (
        <p className="mb-6 text-sm text-emerald-700 dark:text-emerald-400">
          Demo credentials pre-filled. Just click sign in.
        </p>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          Use one of the demo accounts from the landing page, or type your own.
        </p>
      )}

      {error === "invalid" && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Invalid credentials.
        </p>
      )}

      <form action={loginAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue={preset?.email ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            defaultValue={preset?.password ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign in
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <span className="text-zinc-500">Quick demo:</span>
        {(["learner", "admin", "instructor"] as const).map((r) => (
          <Link
            key={r}
            href={`/login?prefill=${r}`}
            className="rounded-full border border-zinc-300 px-2.5 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {r}
          </Link>
        ))}
      </div>
    </main>
  );
}
