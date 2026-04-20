import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";

const features = [
  {
    title: "Mobile-first gamification",
    body: "Streaks, XP bars, and badges. Timezone-safe daily rollover with DST handling, fully unit-tested.",
    icon: "🔥",
  },
  {
    title: "Admin panel with RBAC",
    body: "Three roles, tenant-scoped queries, self-demote protection. Every admin mutation writes a typed audit row.",
    icon: "🛡️",
  },
  {
    title: "Multi-tenant data model",
    body: "Every tenant table carries organizationId. Cross-tenant reads bounce to 403 through a three-layer guard.",
    icon: "🏢",
  },
  {
    title: "Analytics dashboard",
    body: "Daily active users, completion funnel, top learners by XP, weekly retention cohorts. Recharts, server rendered.",
    icon: "📊",
  },
  {
    title: "HMAC-signed webhooks",
    body: "SHA-256 over timestamp, deliveryId, body. Exponential backoff with jitter, capped at 8 attempts.",
    icon: "🔗",
  },
  {
    title: "CSV + PDF exports",
    body: "Progress report as CSV via papaparse, per-learner report card as streamed PDF via @react-pdf/renderer.",
    icon: "📄",
  },
];

const stack = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind v4",
  "PostgreSQL 16",
  "Prisma 6",
  "Auth.js v5",
  "Vitest",
  "Playwright",
  "Recharts",
];

const demoAccounts = [
  {
    role: "Learner",
    email: "learner@demo.test",
    password: "learner123",
    blurb: "Mobile-first dashboard, streak, XP, lessons.",
    accent: "emerald",
  },
  {
    role: "Admin",
    email: "admin@demo.test",
    password: "admin123",
    blurb: "Users, courses, analytics, webhooks, audit log.",
    accent: "sky",
  },
  {
    role: "Instructor",
    email: "instructor@demo.test",
    password: "instructor123",
    blurb: "Course authoring surface (Phase 3 subset).",
    accent: "amber",
  },
] as const;

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
              L
            </span>
            <span>LearnLoop</span>
          </Link>
          <nav className="flex items-center gap-1.5 text-sm">
            <a
              href="https://github.com/atifali-pm/learnloop"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 sm:inline-block"
            >
              GitHub
            </a>
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Sign in →
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-x-0 -top-20 flex justify-center"
          aria-hidden
        >
          <div className="h-72 w-[90%] max-w-4xl rounded-full bg-emerald-500/25 blur-[110px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live portfolio demo
          </span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Daily habits,
            <br className="sm:hidden" />{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              measurable progress.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:mt-6 sm:text-lg dark:text-zinc-400">
            A multi-tenant gamified learning platform with streaks, XP, a role-gated admin panel, and HMAC-signed
            outbound webhooks. Built on Next.js 16, Prisma 6, and PostgreSQL.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login?prefill=learner"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-base font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 sm:w-auto"
            >
              Try the learner demo →
            </Link>
            <Link
              href="/login?prefill=admin"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white/60 px-5 py-3 text-base font-medium text-zinc-900 backdrop-blur transition hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-white dark:hover:bg-zinc-900"
            >
              View admin panel
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Click either button to auto-fill the login form. Credentials also visible below.
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="mx-auto max-w-[340px] overflow-hidden rounded-[2rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl shadow-emerald-500/15 dark:border-zinc-800">
                <Image
                  src="/screenshots/02-learner-dashboard.png"
                  alt="LearnLoop learner dashboard on mobile with streak, XP bar, and lesson list"
                  width={340}
                  height={720}
                  priority
                  className="w-full"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <Image
                  src="/screenshots/07-admin-analytics.png"
                  alt="LearnLoop admin analytics dashboard with DAU chart, funnel, top learners, retention"
                  width={1440}
                  height={900}
                  className="w-full"
                />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-500 sm:text-left">
                Admin analytics: DAU line, completion funnel, top-10 learners, weekly retention.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white/50 px-4 py-14 sm:px-6 sm:py-20 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What&apos;s actually in here
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Every box a senior full-stack role checks, wrapped in one coherent product so a reviewer can trace a learner
              action through the whole system in under a minute.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-xl">
                  {f.icon}
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sign in as any role</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Three seeded demo accounts. Click any card to land on the login page with credentials pre-filled.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {demoAccounts.map((a) => (
              <Link
                key={a.role}
                href={`/login?prefill=${a.role.toLowerCase()}`}
                className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {a.role}
                  </span>
                  <span className="text-emerald-600 opacity-0 transition group-hover:opacity-100 dark:text-emerald-400">
                    →
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{a.blurb}</p>
                <div className="mt-4 space-y-1 rounded-lg bg-zinc-100 p-3 font-mono text-xs dark:bg-zinc-950">
                  <div className="text-zinc-700 dark:text-zinc-300">{a.email}</div>
                  <div className="text-zinc-500">{a.password}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white/50 px-4 py-14 sm:px-6 sm:py-20 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Complete a lesson, watch it ripple</h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Marking a lesson complete fires a single transactional orchestrator that updates progress, activity, XP,
                streak, and badges in one Prisma transaction, then enqueues a signed webhook to every subscribed endpoint.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong>Streak</strong> computed in the user&apos;s local timezone, respecting DST.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong>XP event</strong> appended to a ledger. Level curve is <code>50·n·(n+1)</code>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong>Badges</strong> checked via pure rule matcher over {"{ xp | streak | lessons }"} thresholds.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong>Webhook delivery</strong> signed{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
                      sha256(secret, &quot;ts.deliveryId.body&quot;)
                    </code>
                    , retried with jittered backoff.
                  </span>
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3 text-sm">
                <a
                  href="https://github.com/atifali-pm/learnloop/blob/main/docs/GAMIFICATION.md"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-zinc-300 px-4 py-2 font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Read GAMIFICATION.md →
                </a>
                <a
                  href="https://github.com/atifali-pm/learnloop/blob/main/docs/ARCHITECTURE.md"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-zinc-300 px-4 py-2 font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Architecture doc →
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <Image
                src="/screenshots/08-admin-webhook-detail.png"
                alt="Webhook endpoint detail showing signing secret and delivery log"
                width={1440}
                height={900}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built with</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {stack.map((t) => (
              <span
                key={t}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white/50 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:px-2">
          <div>
            LearnLoop · portfolio build by{" "}
            <a
              href="https://github.com/atifali-pm"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              atifali-pm
            </a>
          </div>
          <div className="flex gap-4">
            <a
              href="https://github.com/atifali-pm/learnloop"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              GitHub
            </a>
            <Link href="/api/health" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              /api/health
            </Link>
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
