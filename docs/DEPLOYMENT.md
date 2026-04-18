# Deployment

LearnLoop runs on **Vercel** (frontend + server) and **Railway** (Postgres). The full demo fits inside both providers' free tiers.

## One-time setup

### 1. Railway Postgres

1. Create a Railway project → **New → Database → PostgreSQL 16**.
2. Copy the `DATABASE_URL` from the *Connect* tab (use the public connection string).
3. If you want migrations to run from CI, add Railway's trusted source IPs OR use the `DATABASE_URL` with `?sslmode=require`.

### 2. Vercel project

1. `vercel link` from this directory, or import the GitHub repo at <https://vercel.com/new>.
2. In **Project Settings → Environment Variables**, set:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Railway connection string |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `AUTH_URL` | `https://<your-deployment>.vercel.app` |
   | `AUTH_TRUST_HOST` | `true` |
   | `WEBHOOK_DRAIN_SECRET` | `openssl rand -hex 32` |
   | `SENTRY_DSN` | *(optional)* |

3. First deploy will fail on missing tables — run migrations (see below) and redeploy.

### 3. Apply migrations (first deploy)

Locally, pointing at the production DATABASE_URL:

```bash
DATABASE_URL="postgresql://..." pnpm exec prisma migrate deploy
DATABASE_URL="postgresql://..." pnpm db:seed   # optional: demo data
```

Subsequent deploys pick up new migrations automatically via the `build` hook (add `prisma migrate deploy` to your build if you want this).

### 4. Webhook drain cron

Add a **Vercel Cron** in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/drain", "schedule": "*/2 * * * *" }
  ]
}
```

And a thin proxy route at `/api/cron/drain` that forwards to the drain endpoint with the shared secret header. Alternatively, call `/api/webhooks/drain` directly from GitHub Actions on a schedule.

## Promoting from dev → prod

| Step | Command |
| --- | --- |
| Lock dependencies | `pnpm install --frozen-lockfile` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Test | `pnpm test` |
| Build | `pnpm build` |

All four happen in CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) on every push.

## Rollback

Vercel keeps every deployment; promote a previous one from the dashboard. Database rollbacks require re-running the previous migration's `down` — Prisma doesn't auto-generate those, so production schema changes should be additive (new columns NULLABLE, no drops) until a v2 migration story is in place.

## Cost ceiling

| Tier | Covers |
| --- | --- |
| Vercel Hobby | 100GB bandwidth, 1000 function hours — enough for portfolio traffic |
| Railway Starter | $5/mo credit — Postgres eats about $2/mo at demo scale |
| Sentry free | 5k events/mo |
