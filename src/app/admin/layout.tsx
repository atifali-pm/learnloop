import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { signOut } from "@/auth";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex flex-col gap-1 border-b border-zinc-200 bg-zinc-50 px-4 py-4 lg:h-dvh lg:w-60 lg:border-b-0 lg:border-r lg:py-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            LearnLoop
          </Link>
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            admin
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden flex-col gap-1 pt-6 text-xs text-zinc-500 lg:flex">
          <span className="truncate">{user.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
