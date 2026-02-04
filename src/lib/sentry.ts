import * as Sentry from "@sentry/react";

let sentryInitialized = false;

export function initSentry() {
  if (sentryInitialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  const tracesSampleRate = Number.parseFloat(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.1",
  );
  const sanitizedSampleRate = Number.isFinite(tracesSampleRate)
    ? Math.min(1, Math.max(0, tracesSampleRate))
    : 0.1;

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_SENTRY_RELEASE,
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.captureConsoleIntegration({ levels: ["error", "warn"] }),
      ],
      tracesSampleRate: sanitizedSampleRate,
    });
    sentryInitialized = true;
  } catch (error) {
    console.error("Sentry initialization failed:", error);
  }
}
