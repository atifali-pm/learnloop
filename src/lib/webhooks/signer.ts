import crypto from "node:crypto";

export type SignedHeaders = {
  "X-LearnLoop-Event": string;
  "X-LearnLoop-Delivery": string;
  "X-LearnLoop-Timestamp": string;
  "X-LearnLoop-Signature": string;
};

export function signPayload(params: {
  secret: string;
  event: string;
  deliveryId: string;
  timestamp?: number;
  body: string;
}): SignedHeaders {
  const ts = String(params.timestamp ?? Math.floor(Date.now() / 1000));
  const toSign = `${ts}.${params.deliveryId}.${params.body}`;
  const sig = crypto.createHmac("sha256", params.secret).update(toSign).digest("hex");
  return {
    "X-LearnLoop-Event": params.event,
    "X-LearnLoop-Delivery": params.deliveryId,
    "X-LearnLoop-Timestamp": ts,
    "X-LearnLoop-Signature": `sha256=${sig}`,
  };
}

export function verifySignature(params: {
  secret: string;
  deliveryId: string;
  timestamp: string;
  body: string;
  signature: string; // "sha256=<hex>"
  toleranceSeconds?: number;
}): boolean {
  const tol = params.toleranceSeconds ?? 300;
  const tsNum = Number(params.timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > tol) return false;

  const toSign = `${params.timestamp}.${params.deliveryId}.${params.body}`;
  const expected = crypto
    .createHmac("sha256", params.secret)
    .update(toSign)
    .digest("hex");
  const prefix = "sha256=";
  if (!params.signature.startsWith(prefix)) return false;
  const got = params.signature.slice(prefix.length);

  const a = Buffer.from(got, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}
