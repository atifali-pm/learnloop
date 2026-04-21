import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { mobileJson, signMobileToken } from "@/lib/mobile-auth";
import type { LoginResponse } from "@learnloop/types";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return mobileJson({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return mobileJson({ error: "invalid_input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.disabled) {
    return mobileJson({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return mobileJson({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await signMobileToken({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  const response: LoginResponse = {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      timezone: user.timezone,
    },
  };

  return mobileJson(response);
}
