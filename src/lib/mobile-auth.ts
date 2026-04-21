import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { MobileUser, Role } from "@learnloop/types";

const ISSUER = "learnloop-web";
const AUDIENCE = "learnloop-mobile";
const ALG = "HS256";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function signMobileToken(user: {
  id: string;
  role: Role;
  organizationId: string;
  email: string;
}): Promise<string> {
  return await new SignJWT({
    role: user.role,
    organizationId: user.organizationId,
    email: user.email,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

export type VerifiedMobileClaims = {
  userId: string;
  email: string;
  role: Role;
  organizationId: string;
};

export async function verifyMobileToken(token: string): Promise<VerifiedMobileClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (!payload.sub) throw new Error("missing sub");
  return {
    userId: payload.sub,
    email: String(payload.email ?? ""),
    role: payload.role as Role,
    organizationId: String(payload.organizationId ?? ""),
  };
}

export type MobileAuthResult =
  | { ok: true; user: MobileUser & { id: string } }
  | { ok: false; status: 401; error: string };

/**
 * Parse and verify the Bearer token. Also re-loads the user from the DB so a
 * disabled user can't keep using an old token.
 */
export async function authenticateMobileRequest(
  request: Request,
): Promise<MobileAuthResult> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "missing_bearer_token" };
  }
  const token = header.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "empty_bearer_token" };

  let claims: VerifiedMobileClaims;
  try {
    claims = await verifyMobileToken(token);
  } catch {
    return { ok: false, status: 401, error: "invalid_token" };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: claims.userId } });
  if (!dbUser || dbUser.disabled) {
    return { ok: false, status: 401, error: "user_unavailable" };
  }

  return {
    ok: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      organizationId: dbUser.organizationId,
      timezone: dbUser.timezone,
    },
  };
}

export function mobileJson(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}
