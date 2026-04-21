import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type {
  CompleteLessonResponse,
  CoursesResponse,
  LoginResponse,
  MeResponse,
} from "@learnloop/types";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3001";

async function main() {
  const login = await fetch(`${BASE}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "learner@demo.test", password: "learner123" }),
  });
  if (!login.ok) throw new Error(`login ${login.status}: ${await login.text()}`);
  const { token, user } = (await login.json()) as LoginResponse;
  console.log(`✓ login ok as ${user.email} (role=${user.role})`);
  console.log(`  token length: ${token.length}`);

  const bearer = { Authorization: `Bearer ${token}` };

  // /me
  const me = await fetch(`${BASE}/api/mobile/me`, { headers: bearer });
  if (!me.ok) throw new Error(`me ${me.status}`);
  const meBody = (await me.json()) as MeResponse;
  console.log(
    `✓ /me ok: streak=${meBody.stats.currentStreak} level=${meBody.stats.level} xp=${meBody.stats.totalXp}`,
  );

  // /courses
  const courses = await fetch(`${BASE}/api/mobile/courses`, { headers: bearer });
  if (!courses.ok) throw new Error(`courses ${courses.status}`);
  const coursesBody = (await courses.json()) as CoursesResponse;
  const first = coursesBody.courses[0];
  console.log(
    `✓ /courses ok: ${coursesBody.courses.length} enrollment(s), first has ${first?.lessons.length ?? 0} lessons, next=${first?.nextLessonId?.slice(0, 8) ?? "none"}`,
  );

  // Reset progression so the smoke is idempotent
  const prisma = new PrismaClient();
  await prisma.xpEvent.deleteMany({ where: { userId: user.id } });
  await prisma.activity.deleteMany({ where: { userId: user.id } });
  await prisma.userBadge.deleteMany({ where: { userId: user.id } });
  await prisma.streak.deleteMany({ where: { userId: user.id } });
  await prisma.progress.deleteMany({ where: { enrollment: { userId: user.id } } });

  // Re-fetch so next lesson is actually lesson #1
  const coursesAfterReset = await fetch(`${BASE}/api/mobile/courses`, { headers: bearer });
  const coursesAfterBody = (await coursesAfterReset.json()) as CoursesResponse;
  const nextId = coursesAfterBody.courses[0]?.nextLessonId;
  if (!nextId) throw new Error("no next lesson after reset");

  const complete = await fetch(`${BASE}/api/mobile/lessons/${nextId}/complete`, {
    method: "POST",
    headers: bearer,
  });
  if (!complete.ok) throw new Error(`complete ${complete.status}: ${await complete.text()}`);
  const completeBody = (await complete.json()) as CompleteLessonResponse;
  console.log(`✓ complete-lesson:`, completeBody);

  // Bad token
  const bad = await fetch(`${BASE}/api/mobile/me`, {
    headers: { Authorization: "Bearer bogus.token.xyz" },
  });
  console.log(`✓ bad token rejected: ${bad.status}`);

  // Missing token
  const miss = await fetch(`${BASE}/api/mobile/me`);
  console.log(`✓ missing token rejected: ${miss.status}`);

  // Cleanup
  await prisma.xpEvent.deleteMany({ where: { userId: user.id } });
  await prisma.activity.deleteMany({ where: { userId: user.id } });
  await prisma.userBadge.deleteMany({ where: { userId: user.id } });
  await prisma.streak.deleteMany({ where: { userId: user.id } });
  await prisma.progress.deleteMany({ where: { enrollment: { userId: user.id } } });
  await prisma.$disconnect();
  console.log("(cleaned up)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
