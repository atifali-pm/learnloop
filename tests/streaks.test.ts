import { describe, it, expect } from "vitest";
import { computeStreak, localDateKey } from "@/lib/gamification/streaks";

const UTC = "UTC";
const NY = "America/New_York";

describe("localDateKey", () => {
  it("formats YYYY-MM-DD in the given timezone", () => {
    const d = new Date("2026-04-17T02:30:00Z");
    expect(localDateKey(d, UTC)).toBe("2026-04-17");
    expect(localDateKey(d, NY)).toBe("2026-04-16");
  });
});

describe("computeStreak", () => {
  const base = { current: 0, longest: 0, lastActivityUtc: null };

  it("starts at 1 on first ever activity", () => {
    const r = computeStreak(base, new Date("2026-04-17T12:00:00Z"), UTC);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.alreadyCountedToday).toBe(false);
    expect(r.broken).toBe(false);
  });

  it("does not double-count same day", () => {
    const r = computeStreak(
      { current: 3, longest: 3, lastActivityUtc: new Date("2026-04-17T06:00:00Z") },
      new Date("2026-04-17T20:00:00Z"),
      UTC,
    );
    expect(r.current).toBe(3);
    expect(r.alreadyCountedToday).toBe(true);
  });

  it("increments when activity is on consecutive local day", () => {
    const r = computeStreak(
      { current: 5, longest: 5, lastActivityUtc: new Date("2026-04-16T23:00:00Z") },
      new Date("2026-04-17T01:00:00Z"),
      UTC,
    );
    expect(r.current).toBe(6);
    expect(r.longest).toBe(6);
    expect(r.broken).toBe(false);
  });

  it("resets to 1 when a day is skipped", () => {
    const r = computeStreak(
      { current: 10, longest: 10, lastActivityUtc: new Date("2026-04-15T12:00:00Z") },
      new Date("2026-04-17T12:00:00Z"),
      UTC,
    );
    expect(r.current).toBe(1);
    expect(r.longest).toBe(10);
    expect(r.broken).toBe(true);
  });

  it("preserves longest across a reset", () => {
    const r = computeStreak(
      { current: 3, longest: 20, lastActivityUtc: new Date("2026-04-10T00:00:00Z") },
      new Date("2026-04-17T00:00:00Z"),
      UTC,
    );
    expect(r.current).toBe(1);
    expect(r.longest).toBe(20);
  });

  it("respects user timezone at UTC boundary", () => {
    // 02:00 UTC on the 18th = 22:00 EDT on the 17th (still 'today' in NY).
    const lastActivityUtc = new Date("2026-04-17T15:00:00Z"); // 11:00 NY (the 17th)
    const now = new Date("2026-04-18T02:00:00Z"); // 22:00 NY (still the 17th)
    const r = computeStreak(
      { current: 4, longest: 4, lastActivityUtc },
      now,
      NY,
    );
    expect(r.alreadyCountedToday).toBe(true);
    expect(r.current).toBe(4);
  });

  it("increments at local midnight even if UTC date didn't change", () => {
    // NY rolls to the 18th at 04:00 UTC.
    const lastActivityUtc = new Date("2026-04-17T20:00:00Z"); // 16:00 NY (the 17th)
    const now = new Date("2026-04-18T05:00:00Z"); // 01:00 NY (the 18th)
    const r = computeStreak(
      { current: 2, longest: 5, lastActivityUtc },
      now,
      NY,
    );
    expect(r.current).toBe(3);
    expect(r.longest).toBe(5);
    expect(r.alreadyCountedToday).toBe(false);
  });

  it("handles DST spring-forward (NY) without skipping a day", () => {
    // 2026 DST spring-forward is 2026-03-08.
    const lastActivityUtc = new Date("2026-03-07T15:00:00Z"); // NY 10:00 (the 7th, EST)
    const now = new Date("2026-03-08T15:00:00Z"); // NY 11:00 (the 8th, EDT)
    const r = computeStreak(
      { current: 1, longest: 1, lastActivityUtc },
      now,
      NY,
    );
    expect(r.current).toBe(2);
    expect(r.broken).toBe(false);
  });

  it("handles DST fall-back (NY) without double-counting", () => {
    // 2026 DST fall-back is 2026-11-01.
    const lastActivityUtc = new Date("2026-11-01T13:00:00Z"); // NY 08:00 EST (the 1st)
    const now = new Date("2026-11-01T23:00:00Z"); // NY 18:00 EST (still the 1st)
    const r = computeStreak(
      { current: 7, longest: 7, lastActivityUtc },
      now,
      NY,
    );
    expect(r.alreadyCountedToday).toBe(true);
  });
});
