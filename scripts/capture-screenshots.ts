import "dotenv/config";
import { chromium, devices } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { completeLesson } from "../src/lib/gamification/complete";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const PORT = Number(process.env.SMOKE_PORT ?? "3001");
const BASE = `http://localhost:${PORT}`;
const OUT_DIR =
  process.env.OUT_DIR ?? path.resolve(__dirname, "../docs/screenshots");

async function login(
  context: import("@playwright/test").BrowserContext,
  email: string,
  password: string,
) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await page.close();
}

async function shoot(
  context: import("@playwright/test").BrowserContext,
  url: string,
  filename: string,
  opts: {
    fullPage?: boolean;
    beforeShoot?: (page: import("@playwright/test").Page) => Promise<void>;
  } = {},
) {
  const page = await context.newPage();
  await page.goto(`${BASE}${url}`);
  await page.waitForLoadState("networkidle");
  if (opts.beforeShoot) await opts.beforeShoot(page);
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, fullPage: opts.fullPage ?? true });
  console.log(`  ${filename}`);
  await page.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const prisma = new PrismaClient();

  const learner = await prisma.user.findUniqueOrThrow({
    where: { email: "learner@demo.test" },
  });
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@demo.test" },
  });

  // Reset learner so screenshots have a predictable state.
  await prisma.xpEvent.deleteMany({ where: { userId: learner.id } });
  await prisma.activity.deleteMany({ where: { userId: learner.id } });
  await prisma.userBadge.deleteMany({ where: { userId: learner.id } });
  await prisma.streak.deleteMany({ where: { userId: learner.id } });
  await prisma.progress.deleteMany({
    where: { enrollment: { userId: learner.id } },
  });

  const course = await prisma.course.findFirstOrThrow({
    where: { slug: "habit-loop-101" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  // Seed the first 2 lessons as completed so the learner home shows real
  // streak + XP + badge activity. Answers pass the quiz.
  for (let i = 0; i < 2; i++) {
    const lesson = course.lessons[i];
    const lessonRow = await prisma.lesson.findUniqueOrThrow({
      where: { id: lesson.id },
    });
    const quiz = lessonRow.quiz as {
      questions: {
        id: string;
        choices: { id: string; correct?: boolean }[];
      }[];
    } | null;
    const answers: Record<string, string> = {};
    if (quiz) {
      for (const q of quiz.questions) {
        const c = q.choices.find((ch) => ch.correct);
        if (c) answers[q.id] = c.id;
      }
    }
    await completeLesson({
      userId: learner.id,
      lessonId: lesson.id,
      answers: Object.keys(answers).length > 0 ? answers : undefined,
    });
  }

  // Drop a pinned announcement so the learner home shows it.
  const existing = await prisma.announcement.findFirst({
    where: {
      organizationId: admin.organizationId,
      title: { startsWith: "Welcome to" },
    },
  });
  if (!existing) {
    await prisma.announcement.create({
      data: {
        organizationId: admin.organizationId,
        authorUserId: admin.id,
        title: "Welcome to Habit Loop 101",
        body: "Finish one lesson today to light your first streak day. Come back tomorrow to keep it alive.",
        published: true,
        pinnedUntil: new Date(Date.now() + 30 * 86_400_000),
      },
    });
  }

  // Make one course owned by the instructor so the instructor dashboard
  // has meaningful content when we capture it.
  const instructorRow = await prisma.user.findUniqueOrThrow({
    where: { email: "instructor@demo.test" },
  });
  if (course.ownerUserId !== instructorRow.id) {
    await prisma.course.update({
      where: { id: course.id },
      data: { ownerUserId: instructorRow.id },
    });
  }

  await prisma.$disconnect();

  const browser = await chromium.launch();

  console.log(`mobile (Pixel 7) → ${OUT_DIR}`);
  const mobile = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: BASE,
  });

  await shoot(mobile, "/", "01-landing-mobile.png");
  await shoot(mobile, "/login?prefill=learner", "02-signin-prefilled.png");

  await login(mobile, "learner@demo.test", "learner123");

  await shoot(mobile, "/learner", "03-learner-home.png");

  // Lesson 3 is the next unlocked, un-completed one. Shows content + quiz.
  const lesson3 = course.lessons[2];
  await shoot(
    mobile,
    `/learner/lessons/${lesson3.id}`,
    "04-learner-lesson-content-quiz.png",
  );

  // Lesson 1 shows the completed state.
  await shoot(
    mobile,
    `/learner/lessons/${course.lessons[0].id}`,
    "05-learner-lesson-completed.png",
  );

  await shoot(mobile, "/learner/leaderboard", "06-learner-leaderboard.png");
  await shoot(mobile, "/learner/catalog", "07-learner-catalog.png");
  await shoot(mobile, "/learner/settings", "08-learner-settings.png");

  await mobile.close();

  console.log(`desktop (1440x900) → ${OUT_DIR}`);
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    baseURL: BASE,
  });

  await login(desktop, "admin@demo.test", "admin123");

  await shoot(desktop, "/admin", "09-admin-overview.png");
  await shoot(desktop, "/admin/users", "10-admin-users-bulk.png");
  await shoot(desktop, `/admin/courses/${course.id}`, "11-admin-course-edit.png");
  await shoot(desktop, "/admin/badges", "12-admin-badges.png");
  await shoot(desktop, "/admin/announcements", "13-admin-announcements.png");
  await shoot(desktop, "/admin/analytics", "14-admin-analytics.png");

  const prisma2 = new PrismaClient();
  let endpoint = await prisma2.webhookEndpoint.findFirst({
    where: { organizationId: admin.organizationId },
  });
  if (!endpoint) {
    endpoint = await prisma2.webhookEndpoint.create({
      data: {
        organizationId: admin.organizationId,
        url: "https://example.com/webhooks/learnloop",
        events: ["lesson.completed", "badge.awarded", "streak.extended"],
        secret: "dem0_d0_not_use_in_production_000000000000000000000000000000000000",
        active: true,
      },
    });
  }
  await prisma2.$disconnect();

  await shoot(desktop, `/admin/webhooks/${endpoint.id}`, "15-admin-webhook-detail.png");
  await shoot(desktop, "/admin/audit", "16-admin-audit.png");
  await shoot(desktop, "/admin/settings", "17-admin-settings.png");

  await desktop.close();

  console.log("desktop (instructor view)");
  const instructor = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    baseURL: BASE,
  });
  await login(instructor, "instructor@demo.test", "instructor123");
  await shoot(instructor, "/instructor", "18-instructor-dashboard.png");

  await instructor.close();
  await browser.close();

  console.log(`\n✓ 18 screenshots captured to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
