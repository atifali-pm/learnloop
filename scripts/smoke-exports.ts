import "dotenv/config";
import { writeFileSync } from "node:fs";

const PORT = process.env.SMOKE_PORT ?? "3001";
const BASE = `http://localhost:${PORT}`;

async function loginAndGetCookie(): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrf = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = (csrfRes.headers as Headers).getSetCookie?.() ?? [];
  const jar = new Map<string, string>();
  for (const c of csrfCookies) {
    const [pair] = c.split(";");
    jar.set(pair.split("=")[0], pair);
  }
  const cookieJar = [...jar.values()].join("; ");

  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: "admin@demo.test",
    password: "admin123",
    callbackUrl: `${BASE}/admin`,
    redirect: "false",
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieJar,
    },
    body,
    redirect: "manual",
  });

  const loginCookies = (loginRes.headers as Headers).getSetCookie?.() ?? [];
  for (const c of loginCookies) {
    const [pair] = c.split(";");
    jar.set(pair.split("=")[0], pair);
  }
  return [...jar.values()].join("; ");
}

async function main() {
  const cookie = await loginAndGetCookie();
  console.log("login ok, got session cookie");

  // Seed a handful of completions so CSV and PDF have data.
  const { completeLesson } = await import("../src/lib/gamification/complete");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const learner = await prisma.user.findUniqueOrThrow({
    where: { email: "learner@demo.test" },
  });
  const course = await prisma.course.findFirstOrThrow({
    where: { slug: "habit-loop-101" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  for (let i = 0; i < 3; i++) {
    await completeLesson({ userId: learner.id, lessonId: course.lessons[i].id });
  }
  console.log("seeded 3 lesson completions for learner");

  const csvRes = await fetch(`${BASE}/admin/exports/progress.csv`, {
    headers: { cookie },
  });
  const csv = await csvRes.text();
  console.log(`csv status=${csvRes.status} bytes=${csv.length}`);
  console.log("csv head:");
  console.log(csv.split("\n").slice(0, 4).join("\n"));

  const pdfRes = await fetch(`${BASE}/admin/users/${learner.id}/report.pdf`, {
    headers: { cookie },
  });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  const pdfPath = `/tmp/learnloop-report-${Date.now()}.pdf`;
  writeFileSync(pdfPath, pdfBuf);
  const isPdf = pdfBuf.subarray(0, 4).toString() === "%PDF";
  console.log(`pdf status=${pdfRes.status} bytes=${pdfBuf.length} valid=${isPdf} saved=${pdfPath}`);

  // Clean up seeded data so subsequent smoke runs start fresh.
  await prisma.xpEvent.deleteMany({ where: { userId: learner.id } });
  await prisma.activity.deleteMany({ where: { userId: learner.id } });
  await prisma.userBadge.deleteMany({ where: { userId: learner.id } });
  await prisma.streak.deleteMany({ where: { userId: learner.id } });
  await prisma.progress.deleteMany({ where: { enrollment: { userId: learner.id } } });
  await prisma.$disconnect();
  console.log("(cleaned up)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
