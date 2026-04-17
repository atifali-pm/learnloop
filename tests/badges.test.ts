import { describe, it, expect } from "vitest";
import { matchesBadgeRule } from "@/lib/gamification/badges";

const stats = { xp: 120, currentStreak: 5, lessonsCompleted: 3 };

describe("matchesBadgeRule", () => {
  it("matches XP threshold at or above value", () => {
    expect(matchesBadgeRule({ type: "xp", threshold: 100 }, stats)).toBe(true);
    expect(matchesBadgeRule({ type: "xp", threshold: 120 }, stats)).toBe(true);
    expect(matchesBadgeRule({ type: "xp", threshold: 121 }, stats)).toBe(false);
  });

  it("matches streak threshold", () => {
    expect(matchesBadgeRule({ type: "streak", threshold: 5 }, stats)).toBe(true);
    expect(matchesBadgeRule({ type: "streak", threshold: 7 }, stats)).toBe(false);
  });

  it("matches lessons threshold", () => {
    expect(matchesBadgeRule({ type: "lessons", threshold: 1 }, stats)).toBe(true);
    expect(matchesBadgeRule({ type: "lessons", threshold: 3 }, stats)).toBe(true);
    expect(matchesBadgeRule({ type: "lessons", threshold: 4 }, stats)).toBe(false);
  });
});
