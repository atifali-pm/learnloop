import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { HABIT_LOOP_101 } from "../prisma/seed-content";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", name: "Demo Academy" },
  });

  const users = [
    { email: "learner@demo.test", name: "Lena Learner", role: "learner" as const, password: "learner123" },
    { email: "instructor@demo.test", name: "Ivan Instructor", role: "instructor" as const, password: "instructor123" },
    { email: "admin@demo.test", name: "Ada Admin", role: "admin" as const, password: "admin123" },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, organizationId: org.id, disabled: false },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        organizationId: org.id,
        timezone: "UTC",
      },
    });
  }

  const course = await prisma.course.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "habit-loop-101" } },
    update: { title: "Habit Loop 101", published: true },
    create: {
      organizationId: org.id,
      slug: "habit-loop-101",
      title: "Habit Loop 101",
      description: "Build a daily learning habit in 10 short lessons.",
      published: true,
    },
  });

  for (let i = 0; i < HABIT_LOOP_101.length; i++) {
    const order = i + 1;
    const seed = HABIT_LOOP_101[i];
    const quizValue: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull = seed.quiz
      ? (seed.quiz as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    await prisma.lesson.upsert({
      where: { courseId_order: { courseId: course.id, order } },
      update: {
        title: seed.title,
        content: seed.content,
        xpReward: seed.xpReward,
        quiz: quizValue,
      },
      create: {
        courseId: course.id,
        order,
        title: seed.title,
        content: seed.content,
        xpReward: seed.xpReward,
        gatingRule: order === 1 ? {} : { requiresLessonOrder: order - 1 },
        quiz: quizValue,
      },
    });
  }

  const learner = await prisma.user.findUnique({ where: { email: "learner@demo.test" } });
  if (learner) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: learner.id, courseId: course.id } },
      update: {},
      create: { userId: learner.id, courseId: course.id, status: "active" },
    });
  }

  const badges = [
    { slug: "first-step", name: "First Step", description: "Complete your first lesson.", rule: { type: "lessons", threshold: 1 } },
    { slug: "week-streak", name: "7-Day Streak", description: "Show up 7 days in a row.", rule: { type: "streak", threshold: 7 } },
    { slug: "xp-100", name: "Century", description: "Earn 100 XP.", rule: { type: "xp", threshold: 100 } },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: b.slug } },
      update: { name: b.name, description: b.description, rule: b.rule },
      create: { ...b, organizationId: org.id },
    });
  }

  console.log("✓ Seed complete");
  console.log(`  org:    ${org.slug}`);
  console.log(`  users:  ${users.map((u) => u.email).join(", ")}`);
  console.log(`  course: ${course.slug} (${HABIT_LOOP_101.length} lessons)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
