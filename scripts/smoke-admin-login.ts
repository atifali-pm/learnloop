import "dotenv/config";

const PORT = process.env.SMOKE_PORT ?? "3001";
const BASE = `http://localhost:${PORT}`;

function parseSetCookie(header: string | null): string[] {
  if (!header) return [];
  // Naive splitter: cookies are comma-separated, but Expires can contain commas.
  // Node 18+ fetch exposes headers.getSetCookie() — use that.
  return [];
}

async function main() {
  // 1. Hit csrf endpoint to obtain csrfToken + cookie.
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrf = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = (csrfRes.headers as Headers).getSetCookie?.() ?? [];
  const jarMap = new Map<string, string>();
  for (const c of csrfCookies) {
    const [pair] = c.split(";");
    const name = pair.split("=")[0];
    jarMap.set(name, pair);
  }
  const cookieJar = [...jarMap.values()].join("; ");

  // 2. POST credentials to callback URL.
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
  const sessionCookie = [...csrfCookies, ...loginCookies]
    .map((c) => c.split(";")[0])
    .filter((c) => c.includes("authjs") || c.includes("next-auth"))
    .join("; ");

  console.log(`login status: ${loginRes.status}`);
  console.log(`login location: ${loginRes.headers.get("location")}`);
  console.log(`csrf cookies: ${csrfCookies.map((c) => c.split(";")[0]).join(" | ")}`);
  console.log(`login cookies: ${loginCookies.map((c) => c.split(";")[0]).join(" | ")}`);
  console.log(`session cookie: ${sessionCookie}`);

  for (const path of ["/admin", "/admin/users", "/admin/courses", "/admin/audit"]) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { cookie: sessionCookie },
      redirect: "manual",
    });
    console.log(`${path} -> ${res.status}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
