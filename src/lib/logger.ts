import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "learnloop" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * reportError is the single drop-in point for external error tracking.
 * Today it just logs via pino. When SENTRY_DSN is wired up, swap the body
 * for `Sentry.captureException(err, { extra: context })`.
 */
export function reportError(err: unknown, context: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ err: { message, stack }, ...context }, "reportError");
}
