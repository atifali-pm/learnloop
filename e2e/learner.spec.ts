import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.describe("learner happy path", () => {
  test.beforeEach(async () => {
    // Reset the demo learner's progression so the run is idempotent.
    const learner = await prisma.user.findUniqueOrThrow({
      where: { email: "learner@demo.test" },
    });
    await prisma.xpEvent.deleteMany({ where: { userId: learner.id } });
    await prisma.activity.deleteMany({ where: { userId: learner.id } });
    await prisma.userBadge.deleteMany({ where: { userId: learner.id } });
    await prisma.streak.deleteMany({ where: { userId: learner.id } });
    await prisma.progress.deleteMany({
      where: { enrollment: { userId: learner.id } },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("login → complete lesson → streak + XP on dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("learner@demo.test");
    await page.getByLabel("Password").fill("learner123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Auth.js issues a 303 to /dashboard. Wait for either the dashboard or a
    // bounce back to /login (which would indicate auth failed).
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForLoadState("networkidle");

    await page.goto("/learner");
    await expect(page).toHaveURL(/\/learner$/);

    // Streak should start at 0 and level at L1.
    await expect(page.getByText("0🔥")).toBeVisible();
    await expect(page.getByText("L1")).toBeVisible();

    // Open the first unlocked lesson.
    await page.getByRole("link", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/learner\/lessons\//);

    await page.getByRole("button", { name: /mark complete/i }).click();
    await expect(page.getByText(/Completed\./)).toBeVisible();
    await expect(page.getByText(/\+10 XP · streak 1/)).toBeVisible();

    // Go back to the dashboard; streak + XP should have updated.
    await page.getByRole("link", { name: "← Back" }).click();
    await expect(page).toHaveURL(/\/learner$/);
    await expect(page.getByText("1🔥")).toBeVisible();
    await expect(page.getByText("10 XP", { exact: true })).toBeVisible();
  });
});
