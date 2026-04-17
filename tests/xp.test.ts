import { describe, it, expect } from "vitest";
import { xpForLevel, levelFromXp } from "@/lib/gamification/xp";

describe("xpForLevel", () => {
  it("is monotonically increasing", () => {
    let prev = 0;
    for (let l = 1; l <= 10; l++) {
      const xp = xpForLevel(l);
      expect(xp).toBeGreaterThan(prev);
      prev = xp;
    }
  });
});

describe("levelFromXp", () => {
  it("level 1 at 0 xp", () => {
    const r = levelFromXp(0);
    expect(r.level).toBe(1);
    expect(r.xpIntoLevel).toBe(0);
    expect(r.xpToNext).toBeGreaterThan(0);
  });

  it("advances through thresholds", () => {
    // level 1 ceiling is xpForLevel(1) = 100
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(299).level).toBe(2); // level 2 ceiling is 300
    expect(levelFromXp(300).level).toBe(3);
  });
});
