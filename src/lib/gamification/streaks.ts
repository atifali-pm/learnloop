export type StreakState = {
  current: number;
  longest: number;
  lastActivityUtc: Date | null;
};

export type StreakResult = {
  current: number;
  longest: number;
  alreadyCountedToday: boolean;
  broken: boolean;
};

export function localDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

export function computeStreak(
  prev: StreakState,
  now: Date,
  timezone: string,
): StreakResult {
  const todayKey = localDateKey(now, timezone);

  if (!prev.lastActivityUtc) {
    return {
      current: 1,
      longest: Math.max(prev.longest, 1),
      alreadyCountedToday: false,
      broken: false,
    };
  }

  const lastKey = localDateKey(prev.lastActivityUtc, timezone);

  if (lastKey === todayKey) {
    return {
      current: prev.current,
      longest: prev.longest,
      alreadyCountedToday: true,
      broken: false,
    };
  }

  const diff = daysBetweenKeys(lastKey, todayKey);

  if (diff === 1) {
    const current = prev.current + 1;
    return {
      current,
      longest: Math.max(prev.longest, current),
      alreadyCountedToday: false,
      broken: false,
    };
  }

  return {
    current: 1,
    longest: Math.max(prev.longest, 1),
    alreadyCountedToday: false,
    broken: true,
  };
}
