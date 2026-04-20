import "dotenv/config";
import { chromium, devices } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { completeLesson } from "../src/lib/gamification/complete";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const PORT = Number(process.env.SMOKE_PORT ?? "3001");
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = process.env.OUT_DIR ?? path.resolve(__dirname, "../docs/screenshots");

async function login(context: import("@playwright/test").BrowserContext, email: string, password: string) {
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
  opts: { fullPage?: boolean; beforeShoot?: (page: import("@playwright/test").Page) => Promise<void> } = {},
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

  // Prime the demo learner with 3 completed lessons so dashboard + analytics
  // have real numbers (XP bar filled, streak lit, lessons marked done).
  const prisma = new PrismaClient();
  const learner = await prisma.user.findUniqueOrThrow({ where: { email: "learner@demo.test" } });

  await prisma.xpEvent.deleteMany({ where: { userId: learner.id } });
  await prisma.activity.deleteMany({ where: { userId: learner.id } });
  await prisma.userBadge.deleteMany({ where: { userId: learner.id } });
  await prisma.streak.deleteMany({ where: { userId: learner.id } });
  await prisma.progress.deleteMany({ where: { enrollment: { userId: learner.id } } });

  const course = await prisma.course.findFirstOrThrow({
    where: { slug: "habit-loop-101" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  for (let i = 0; i < 3; i++) {
    await completeLesson({ userId: learner.id, lessonId: course.lessons[i].id });
  }
  await prisma.$disconnect();

  const browser = await chromium.launch();

  console.log(`mobile (Pixel 7) → ${OUT_DIR}`);
  const mobile = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: BASE,
  });
  // Learner is the mobile-first persona.
  await login(mobile, "learner@demo.test", "learner123");
  await shoot(mobile, "/", "01-landing-mobile.png");
  await shoot(mobile, "/learner", "02-learner-dashboard.png");
  // Next un-completed lesson is order 4 → click continue flow manually.
  await shoot(mobile, `/learner/lessons/${course.lessons[3].id}`, "03-learner-lesson.png");
  await shoot(mobile, `/learner/lessons/${course.lessons[0].id}`, "04-learner-lesson-completed.png");
  await mobile.close();

  console.log(`desktop (1440x900) → ${OUT_DIR}`);
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    baseURL: BASE,
  });
  await login(desktop, "admin@demo.test", "admin123");
  await shoot(desktop, "/admin", "05-admin-overview.png");
  await shoot(desktop, "/admin/users", "06-admin-users.png");
  await shoot(desktop, "/admin/analytics", "07-admin-analytics.png");

  // Create a webhook endpoint if none exists so the detail page has content to show.
  const prisma2 = new PrismaClient();
  const admin = await prisma2.user.findUniqueOrThrow({ where: { email: "admin@demo.test" } });
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

  await shoot(desktop, `/admin/webhooks/${endpoint.id}`, "08-admin-webhook-detail.png");

  const courseForEdit = await new PrismaClient().course.findFirstOrThrow({
    where: { slug: "habit-loop-101" },
  });
  await shoot(desktop, `/admin/courses/${courseForEdit.id}`, "09-admin-course-edit.png");

  await shoot(desktop, "/admin/audit", "10-admin-audit-log.png");

  await desktop.close();
  await browser.close();

  console.log(`\n✓ ${10} screenshots captured to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
