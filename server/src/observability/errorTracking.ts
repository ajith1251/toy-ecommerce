/**
 * Provider-agnostic error-tracking boundary. The application reports
 * exceptions through `captureException`/`captureMessage` without knowing
 * which platform (Sentry, Honeybadger, …) receives them.
 *
 * Default backend: structured console logging (always available, zero
 * dependencies). To plug a real provider, install its SDK and call
 * `setErrorTracker` once at boot with an adapter — no other code changes.
 *
 * Privacy rule: callers must never attach passwords, session tokens,
 * payment credentials or card data to the context. Contexts are metadata
 * only (requestId, route, user id).
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export interface ErrorTracker {
  captureException(err: unknown, context?: ErrorContext): void;
  captureMessage(message: string, context?: ErrorContext): void;
}

const consoleTracker: ErrorTracker = {
  captureException(err, context) {
    const detail = err instanceof Error ? err.stack : String(err);
    console.error(JSON.stringify({ time: new Date().toISOString(), level: 'error', msg: 'unhandled_exception', error: detail, ...context }));
  },
  captureMessage(message, context) {
    console.error(JSON.stringify({ time: new Date().toISOString(), level: 'error', msg: message, ...context }));
  },
};

let tracker: ErrorTracker = consoleTracker;

export function setErrorTracker(next: ErrorTracker): void {
  tracker = next;
}

export function getErrorTracker(): ErrorTracker {
  return tracker;
}

export function captureException(err: unknown, context?: ErrorContext): void {
  try {
    tracker.captureException(err, context);
  } catch {
    // A failing tracker must never take the application down.
  }
}

export function captureMessage(message: string, context?: ErrorContext): void {
  try {
    tracker.captureMessage(message, context);
  } catch {
    // A failing tracker must never take the application down.
  }
}
