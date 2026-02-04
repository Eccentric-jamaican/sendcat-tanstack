import * as Sentry from "@sentry/node";

let sentryServerInitialized = false;

export function initSentryServer() {
  if (sentryServerInitialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const tracesSampleRate = Number.parseFloat(
    process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1",
  );
  const sanitizedSampleRate = Number.isFinite(tracesSampleRate)
    ? Math.min(1, Math.max(0, tracesSampleRate))
    : 0.1;

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: sanitizedSampleRate,
    });
    sentryServerInitialized = true;
  } catch (error) {
    console.error("Sentry server initialization failed:", error);
  }
}

export async function captureServerException(error: unknown) {
  initSentryServer();
  if (sentryServerInitialized) {
    Sentry.captureException(error);
    await Sentry.flush(2000);
  }
}

export function withSentry<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs) => {
    initSentryServer();
    try {
      return await handler(...args);
    } catch (error) {
      await captureServerException(error);
      throw error;
    }
  };
}
