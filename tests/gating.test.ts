import { describe, it, expect } from "vitest";
import { evaluateGating, parseGatingRule } from "@/lib/gamification/gating";

describe("parseGatingRule", () => {
  it("returns empty rule for null/undefined/invalid input", () => {
    expect(parseGatingRule(null)).toEqual({});
    expect(parseGatingRule(undefined)).toEqual({});
    expect(parseGatingRule({ bogus: true })).toEqual({});
  });

  it("parses valid requiresLessonOrder", () => {
    expect(parseGatingRule({ requiresLessonOrder: 3 })).toEqual({ requiresLessonOrder: 3 });
  });

  it("parses valid requiresXp", () => {
    expect(parseGatingRule({ requiresXp: 100 })).toEqual({ requiresXp: 100 });
  });
});

describe("evaluateGating", () => {
  it("unlocks when there are no requirements", () => {
    expect(
      evaluateGating({}, { completedLessonOrders: new Set(), currentXp: 0 }),
    ).toEqual({ unlocked: true });
  });

  it("locks until prerequisite lesson is completed", () => {
    const r = evaluateGating(
      { requiresLessonOrder: 2 },
      { completedLessonOrders: new Set([1]), currentXp: 999 },
    );
    expect(r.unlocked).toBe(false);
    if (!r.unlocked) expect(r.reason).toMatch(/lesson 2/);
  });

  it("unlocks when prerequisite is completed", () => {
    expect(
      evaluateGating(
        { requiresLessonOrder: 2 },
        { completedLessonOrders: new Set([1, 2]), currentXp: 0 },
      ),
    ).toEqual({ unlocked: true });
  });

  it("locks when XP threshold is unmet", () => {
    const r = evaluateGating(
      { requiresXp: 100 },
      { completedLessonOrders: new Set(), currentXp: 40 },
    );
    expect(r.unlocked).toBe(false);
    if (!r.unlocked) expect(r.reason).toMatch(/100 XP/);
  });

  it("unlocks when both prereqs met", () => {
    const r = evaluateGating(
      { requiresLessonOrder: 1, requiresXp: 50 },
      { completedLessonOrders: new Set([1]), currentXp: 60 },
    );
    expect(r.unlocked).toBe(true);
  });
});
