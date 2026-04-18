import { describe, it, expect } from "vitest";
import { signPayload, verifySignature, generateSecret } from "@/lib/webhooks/signer";

describe("webhook signer", () => {
  const secret = "test-secret-000111222333";
  const deliveryId = "del_123";
  const event = "lesson.completed";
  const body = JSON.stringify({ event, data: { userId: "u_1", lessonId: "l_1" } });

  it("round-trips a valid signature", () => {
    const headers = signPayload({ secret, event, deliveryId, body });
    expect(headers["X-LearnLoop-Event"]).toBe(event);
    expect(headers["X-LearnLoop-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);

    const ok = verifySignature({
      secret,
      deliveryId,
      timestamp: headers["X-LearnLoop-Timestamp"],
      body,
      signature: headers["X-LearnLoop-Signature"],
    });
    expect(ok).toBe(true);
  });

  it("rejects a tampered body", () => {
    const headers = signPayload({ secret, event, deliveryId, body });
    const ok = verifySignature({
      secret,
      deliveryId,
      timestamp: headers["X-LearnLoop-Timestamp"],
      body: body + "X",
      signature: headers["X-LearnLoop-Signature"],
    });
    expect(ok).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const headers = signPayload({ secret, event, deliveryId, body });
    const ok = verifySignature({
      secret: "different-secret",
      deliveryId,
      timestamp: headers["X-LearnLoop-Timestamp"],
      body,
      signature: headers["X-LearnLoop-Signature"],
    });
    expect(ok).toBe(false);
  });

  it("rejects signatures older than the tolerance window", () => {
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    const headers = signPayload({
      secret,
      event,
      deliveryId,
      body,
      timestamp: tenMinutesAgo,
    });
    const ok = verifySignature({
      secret,
      deliveryId,
      timestamp: headers["X-LearnLoop-Timestamp"],
      body,
      signature: headers["X-LearnLoop-Signature"],
      toleranceSeconds: 300,
    });
    expect(ok).toBe(false);
  });

  it("generates 64-char hex secrets", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });
});
