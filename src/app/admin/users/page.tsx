import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const ROLE_OPTIONS: { value: Role | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "learner", label: "Learner" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; disabled?: string }>;
}) {
  const admin = await requireRole("admin");
  const { role, q, disabled } = await searchParams;

  const where: Parameters<typeof prisma.user.findMany>[0] = {
    where: {
      organizationId: admin.organizationId,
      ...(role && role !== "all" ? { role: role as Role } : {}),
      ...(disabled === "true"
        ? { disabled: true }
        : disabled === "false"
          ? { disabled: false }
          : {}),
      ...(q && q.trim()
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  };

  const users = await prisma.user.findMany(where);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-zinc-500">{users.length} shown</p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="email or name"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Role
          <select
            name="role"
            defaultValue={role ?? "all"}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Status
          <select
            name="disabled"
            defaultValue={disabled ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Any</option>
            <option value="false">Active</option>
            <option value="true">Disabled</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="hidden px-3 py-2 sm:table-cell">Status</th>
              <th className="hidden px-3 py-2 sm:table-cell">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.name ?? "—"}</div>
                  <div className="text-xs text-zinc-500">{u.email}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs uppercase tracking-wide dark:bg-zinc-800">
                    {u.role}
                  </span>
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {u.disabled ? (
                    <span className="text-red-600 dark:text-red-400">Disabled</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-xs text-zinc-500 sm:table-cell">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-sm underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No users match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
