/**
 * Wire types shared between the LearnLoop web backend (/api/mobile/*) and
 * the LearnLoop mobile app. Keep this pure TypeScript — no runtime deps.
 */

export type Role = "learner" | "instructor" | "admin";

export type ApiError = {
  error: string;
  message?: string;
};

// POST /api/mobile/auth/login
export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: MobileUser;
};

export type MobileUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string;
  timezone: string;
};

// GET /api/mobile/me
export type MeResponse = {
  user: MobileUser;
  stats: {
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpToNext: number;
    currentStreak: number;
    longestStreak: number;
    badgeCount: number;
  };
  badges: MobileBadge[];
};

export type MobileBadge = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  awardedAt: string;
};

// GET /api/mobile/courses
export type CoursesResponse = {
  courses: MobileCourse[];
};

export type MobileCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  enrollmentStatus: "active" | "completed" | "dropped";
  lessons: MobileLesson[];
  nextLessonId: string | null;
};

export type MobileLesson = {
  id: string;
  order: number;
  title: string;
  content: string | null;
  xpReward: number;
  completed: boolean;
  unlocked: boolean;
  lockReason: string | null;
};

// POST /api/mobile/lessons/[id]/complete
export type CompleteLessonResponse =
  | {
      ok: true;
      alreadyCompleted: boolean;
      xpAwarded: number;
      totalXp: number;
      level: number;
      streak: { current: number; longest: number };
      badgesAwarded: string[];
    }
  | { ok: false; reason: string };
