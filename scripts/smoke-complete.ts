import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { completeLesson } from "../src/lib/gamification/complete";

const prisma = new PrismaClient();

async function main() {
  const learner = await prisma.user.findUnique({ where: { email: "learner@demo.test" } });
  if (!learner) throw new Error("demo learner not seeded");

  const course = await prisma.course.findFirst({
    where: { slug: "habit-loop-101" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course) throw new Error("demo course not seeded");

  console.log(`learner: ${learner.email}  course: ${course.slug}`);

  for (let i = 0; i < 3; i++) {
    const lesson = course.lessons[i];
    const r = await completeLesson({ userId: learner.id, lessonId: lesson.id });
    console.log(`lesson ${lesson.order} (${lesson.title}):`, r);
  }

  const finalXp = await prisma.xpEvent.aggregate({
    where: { userId: learner.id },
    _sum: { delta: true },
  });
  const streak = await prisma.streak.findUnique({ where: { userId: learner.id } });
  const badges = await prisma.userBadge.findMany({
    where: { userId: learner.id },
    include: { badge: true },
  });

  console.log("---");
  console.log(`total XP:   ${finalXp._sum.delta ?? 0}`);
  console.log(`streak:     current=${streak?.current ?? 0} longest=${streak?.longest ?? 0}`);
  console.log(`badges:     ${badges.map((b) => b.badge.name).join(", ") || "(none)"}`);

  // reset for clean state
  await prisma.xpEvent.deleteMany({ where: { userId: learner.id } });
  await prisma.activity.deleteMany({ where: { userId: learner.id } });
  await prisma.userBadge.deleteMany({ where: { userId: learner.id } });
  await prisma.streak.deleteMany({ where: { userId: learner.id } });
  await prisma.progress.deleteMany({
    where: { enrollment: { userId: learner.id } },
  });
  console.log("(cleaned up)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
