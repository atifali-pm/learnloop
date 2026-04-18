# Gamification rules engine

LearnLoop's gamification is structured as **four pure functions plus one transactional orchestrator**. The pure layer is fully unit-tested with Vitest; the orchestrator composes it inside a single Prisma transaction so that a half-written completion can never leave the database inconsistent.

## Why pure functions

Streaks are a notorious timezone bug magnet. Gating rules are combinatorial. Badge rules are user-configurable. Writing them as pure input → output functions means:

- they can be unit-tested against dozens of edge cases (DST transitions, UTC midnight crossings, rule-AND-rule-simultaneously-unmet cases)
- the logic is portable — we could move it to an edge runtime, a Cloudflare Worker, or a React Native client without dragging Prisma with it
- every decision is reproducible from just its inputs, so an audit log or bug report contains enough to replay the call

The files:

| Module | Responsibility |
| --- | --- |
| [`streaks.ts`](../src/lib/gamification/streaks.ts) | Timezone-safe streak calculation |
| [`gating.ts`](../src/lib/gamification/gating.ts) | Zod-validated rule parsing + lock evaluation |
| [`badges.ts`](../src/lib/gamification/badges.ts) | Discriminated-union rule matcher |
| [`xp.ts`](../src/lib/gamification/xp.ts) | Level curve + XP totals |
| [`complete.ts`](../src/lib/gamification/complete.ts) | Transactional orchestrator for a lesson completion |
| [`learner-view.ts`](../src/lib/gamification/learner-view.ts) | Aggregated query for the learner dashboard |

## Streak rules

A streak increments **once per local calendar day** for the user's timezone. UTC storage, local evaluation.

```ts
computeStreak(prev, now, timezone) → {
  current,
  longest,
  alreadyCountedToday,  // true = no-op; don't award XP again today
  broken,               // true = streak reset from N back to 1
}
```

Key decisions:

- **"Local day" is Intl.DateTimeFormat(timezone).format(date) sliced to `YYYY-MM-DD`.** This avoids parsing edge cases and respects DST.
- **Day diff uses `Date.UTC(y,m,d)` on parsed local-key components**, so DST spring-forward and fall-back never cause off-by-one errors.
- **"Already counted today" is a no-op path, not a failure.** The UI shows the existing streak; the XP event is skipped.
- **Longest is preserved across resets.** A broken streak resets `current` to 1 but keeps `longest` at its historical max.

Tests cover the DST-sensitive edges — 2026 spring-forward and fall-back in `America/New_York` are both in [`tests/streaks.test.ts`](../tests/streaks.test.ts).

## Gating rules

Each lesson stores a `gatingRule` JSON column. Today's schema:

```ts
type GatingRule = {
  requiresLessonOrder?: number; // must have completed lesson with this `order`
  requiresXp?: number;          // must have this much XP
};
```

Unknown keys are silently dropped by Zod's `strict()` schema — a corrupt or forward-compatible rule degrades to "no requirement" rather than crashing the page.

`evaluateGating(rule, stats)` returns a discriminated union so every code path must handle the lock reason. Adding a new rule type (e.g. `requiresBadge`, `requiresPreviousCourse`) is one additional branch + one case in the matcher.

## Badge rules

Badges are stored as rows on `badges` with a JSON `rule`. The rule is a Zod discriminated union:

```ts
{ type: "xp";      threshold: number }
{ type: "streak";  threshold: number }
{ type: "lessons"; threshold: number }
```

`evaluateBadges` runs after every lesson completion:

1. Fetch all org-scoped badges.
2. Fetch badges the user already has.
3. For each unclaimed badge, run `matchesBadgeRule(rule, stats)`.
4. `createMany({ skipDuplicates: true })` for any new matches.

Because badges are additive and rules are pure, this is idempotent — running it twice in a row produces the same set of user_badges rows.

## XP + levels

XP is an append-only ledger (`xp_events`). Totals are always `SUM(delta)`. This lets the rules engine grant negative XP (e.g. for reverting a fraudulent completion) without schema surgery.

Level thresholds use a quadratic curve: `xpForLevel(n) = 50 * n * (n + 1)`. So L1 at 100 XP, L2 at 300, L3 at 600. Flat enough that early players level fast, steep enough that the curve stays meaningful.

## The orchestrator

[`completeLesson(userId, lessonId)`](../src/lib/gamification/complete.ts) is the one place that mutates lesson-completion state. It:

1. Loads the user, lesson, course, and existing enrollment.
2. Tenant-checks (lesson's course must belong to the user's org).
3. Evaluates gating against the user's current completions + XP.
4. Enters a Prisma transaction:
   - Upserts `progress.completedAt = now`
   - Inserts an `activities` row with `type = "lesson_completed"`
   - Inserts an `xp_events` row (only if not already completed)
   - Upserts the `streaks` row with the new streak state
5. Re-fetches total XP + lessons completed (outside the txn; only read).
6. Runs `evaluateBadges` against the fresh stats.
7. Fan-out: calls `enqueueWebhookEvent` for `lesson.completed`, `streak.extended` (when streak actually grew), and `badge.awarded` per new badge. Webhook rows land in the same DB and are picked up by the worker.

Replay safety: the unique constraint on `progress (enrollmentId, lessonId)` means a double-submit upserts rather than inserting twice; the `alreadyCompleted` flag short-circuits XP and the three webhook fan-outs.

## Observability

- Every mutation writes to `activities` — this is what the DAU and retention analytics read.
- Every admin-driven role / course mutation writes to `audit_logs` separately.
- Webhook deliveries are their own log table (`webhook_deliveries`) with status, attempts, and `lastError`.

Between those three tables and the append-only `xp_events`, you can reconstruct why any number on the learner dashboard is what it is.
