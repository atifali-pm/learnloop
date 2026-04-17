# LearnLoop

Multi-tenant gamified learning platform. Portfolio project demonstrating RBAC, admin panel, gamification mechanics, webhook integrations, and PostgreSQL relational modeling on Next.js 16 + Prisma.

## Stack

- **Next.js 16** (App Router, RSC, Server Actions, Turbopack)
- **React 19 · TypeScript · Tailwind v4** (mobile-first)
- **Prisma 6 · PostgreSQL 16**
- **Auth.js v5** (credentials; magic-link slot ready)
- **Zod · Vitest · Playwright**

## Quick start

```bash
nvm use                  # Node 22 (see .nvmrc)
pnpm install
pnpm db:up               # Postgres 16 on port 5455
cp .env.example .env     # adjust AUTH_SECRET etc.
pnpm db:migrate          # apply initial schema
pnpm db:seed             # 1 org, 3 users, 1 course with 10 lessons
pnpm dev
```

Open <http://localhost:3000> and sign in with one of the demo accounts:

| Role       | Email                    | Password         |
| ---------- | ------------------------ | ---------------- |
| learner    | learner@demo.test        | `learner123`     |
| instructor | instructor@demo.test     | `instructor123`  |
| admin      | admin@demo.test          | `admin123`       |

## Scripts

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Next.js dev server                 |
| `pnpm typecheck`    | `tsc --noEmit`                     |
| `pnpm lint`         | ESLint                             |
| `pnpm test`         | Vitest                             |
| `pnpm db:up`        | Start Postgres via docker-compose  |
| `pnpm db:migrate`   | Apply Prisma migrations (dev)      |
| `pnpm db:reset`     | Drop + re-migrate + seed           |
| `pnpm db:seed`      | Re-run demo seed                   |
| `pnpm db:studio`    | Prisma Studio                      |

## Phase status

- [x] Phase 1 — foundation + data model (auth, RBAC middleware, shell pages, seed)
- [ ] Phase 2 — learner experience + gamification engine
- [ ] Phase 3 — admin panel + audit log
- [ ] Phase 4 — analytics + exports + outbound webhooks
- [ ] Phase 5 — polish + deploy + portfolio package

See `/home/atif/projects/portfolio/hands-on/HANDS-ON-learnloop.md` for the full spec.
