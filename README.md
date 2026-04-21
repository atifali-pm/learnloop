# LearnLoop

A multi-tenant gamified learning platform. Learners complete daily lessons, earn XP, keep streaks alive, and unlock the next level. Admins run the system through a role-gated panel with user management, course authoring, analytics, exports, and HMAC-signed webhooks.

Live: https://learnloop-ruby.vercel.app

## Explain it like I'm 13

Imagine Duolingo, but you (or your school, or your gym) can run your own copy of it.

- **Learners** open the app on their phone, see today's lesson, tap "mark complete," and watch their **streak** go up and their **XP** fill a bar. Keep showing up and you level up and earn **badges**.
- **Teachers and admins** open a desktop panel to add courses and lessons, see who's active, see who's winning the XP leaderboard, and download a progress spreadsheet or a PDF report card for any learner.
- **Other apps** can hook in. Whenever a learner finishes a lesson, LearnLoop can send a signed message to a URL you pick (a "webhook") that says "hey, Lena just finished Lesson 3, gave her 10 XP." The signature proves the message really came from LearnLoop and wasn't tampered with.

Under the hood there are two big ideas:

1. **Rules are pure functions.** Streaks, unlocking the next lesson, and "did you just earn a badge?" are all small functions that take your current state in and return the new state out. Because they're pure, they can be tested with dozens of tricky cases (like daylight-savings transitions, or someone playing at 11:59 pm then again at 12:01 am) without ever touching the database.
2. **Everything important leaves a receipt.** Every XP point is a row in an append-only ledger. Every admin action writes to an audit log. Every webhook send tracks its attempts. If anything ever looks wrong, you can trace exactly what happened and when.

## Screenshots

| Learner (mobile, Pixel 7) | Admin (desktop) |
| :--- | :--- |
| ![Learner dashboard with streak, level, XP bar, lesson list](docs/screenshots/02-learner-dashboard.png) | ![Admin overview with user, course, and XP counts](docs/screenshots/05-admin-overview.png) |
| ![Lesson detail with mark-complete CTA](docs/screenshots/03-learner-lesson.png) | ![Filterable user management table](docs/screenshots/06-admin-users.png) |
| ![Lesson marked complete with reward toast and next lesson CTA](docs/screenshots/04-learner-lesson-completed.png) | ![Analytics dashboard with DAU, funnel, top learners, retention](docs/screenshots/07-admin-analytics.png) |
| ![Landing page on mobile](docs/screenshots/01-landing-mobile.png) | ![Webhook endpoint detail with signing secret and delivery log](docs/screenshots/08-admin-webhook-detail.png) |
| &nbsp; | ![Course edit with full lesson CRUD](docs/screenshots/09-admin-course-edit.png) |
| &nbsp; | ![Audit log viewer with action filter](docs/screenshots/10-admin-audit-log.png) |

## Phases / Milestones

- [x] **Phase 1.** Foundation: Next.js App Router, Prisma schema, Auth.js credentials, seed with 1 org, 3 roles, 1 course, 10 lessons, 3 badges.
- [x] **Phase 2.** Gamification engine: pure TypeScript for streaks, gating, badges, XP level curve. 30 Vitest tests including DST transitions and UTC midnight edges.
- [x] **Phase 3.** Admin panel: filterable user list, role change with self-demote protection, disable / enable, course CRUD with lesson authoring, audit log on every mutation.
- [x] **Phase 4.** Analytics, exports, webhooks: DAU chart, completion funnel, top learners, retention cohorts, CSV progress dump, streamed PDF report cards, HMAC-SHA256 outbound webhooks with exponential backoff and retry.
- [x] **Phase 5.** Polish and deploy: health endpoint, error boundaries, skeleton loading states, Playwright happy path on Pixel 7, GitHub Actions CI, Vercel plus Railway deploy.
- [x] **Phase 6.** Mobile companion app: pnpm workspace, shared `@learnloop/types`, Bearer-JWT `/api/mobile/*` endpoints, Expo React Native app with signin, tabs for Home / Courses / Profile, and a lesson screen with animated reward toast.
- [ ] 90-second demo video.
- [ ] Fiverr portfolio upload and LinkedIn Projects entry.

## User stories / Use cases

### Learner

- **Sign in on my phone in under 10 seconds.** Three demo accounts are one tap away from the signin screen.
- **See whether I'm on a streak.** Open the home tab, see the fire counter and today's next lesson without scrolling.
- **Finish a lesson and feel the reward.** Tap "mark complete," see a +10 XP toast, watch the XP bar fill, and get the next lesson suggested right below.
- **Know what's locked and why.** Lessons that need a previous lesson (or a certain XP total) show the reason inline, so I'm not guessing.
- **Pick up where I left off.** The home screen's "next up" always points at the first unlocked lesson I haven't finished.
- **See my badges.** Profile tab lists every badge I've earned, with the date.

### Admin

- **Add a new team member.** Go to Users, search for them, change their role from learner to instructor or admin. The old role and new role both land in the audit log.
- **Suspend a user.** Disable their account from their profile page. They can no longer sign in. The audit log records the action and who did it.
- **Create a course and its lessons.** From Courses, create the course with a slug and title, then add lessons one at a time with a title, content, XP reward, and optional gating rule JSON (for example, `{"requiresLessonOrder": 1}`). Publish when ready.
- **See who's active.** Open Analytics for daily active users over the last 30 days, a completion funnel per lesson, the top-10 learners by XP, and a weekly retention grid.
- **Export progress.** Download a CSV with every completed lesson across the org, or a single learner's PDF report card with stats, badges, and a per-course lesson table.
- **Wire LearnLoop into another system.** Register a webhook endpoint, pick the events (lesson.completed, badge.awarded, streak.extended), and receive signed JSON payloads. The delivery log shows attempts, the last error, and lets me retry a specific delivery.

### External system (webhook receiver)

- **Trust that a request really came from LearnLoop.** Every request carries `X-LearnLoop-Signature: sha256=<hex>` computed over `timestamp.deliveryId.body`. Verifying with the endpoint's secret gives me both authentication and integrity.
- **Not get spammed by retries forever.** If my endpoint returns 5xx, LearnLoop retries with exponential backoff and jitter, then gives up after 8 attempts.

### Developer / future maintainer

- **Read one doc to understand the rules engine.** `docs/GAMIFICATION.md` covers every decision: why streaks are computed in the user's local timezone, what the gating rule schema looks like, how the badge rule matcher is a discriminated union, and why the XP ledger is append-only.
- **Read another doc to understand request lifecycles.** `docs/ARCHITECTURE.md` has mermaid diagrams for "learner completes a lesson" and "admin changes a role," including webhook fan-out.
- **Run the whole stack on a fresh laptop in under 5 minutes.** `nvm use && pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`.
