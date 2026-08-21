/**
 * Provider-agnostic client-side error tracking boundary.
 *
 * The app reports unexpected errors through `captureException` without
 * knowing which platform receives them. Default backend: console (always
 * available). To plug a real provider (Sentry, …), install its SDK and
 * replace the reporter via `setErrorReporter` once in main.tsx — no other
 * code changes.
 *
 * Privacy rule: never attach passwords, session data, payment details or
 * addresses to the context. Metadata only (component stack, route).
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export type ErrorReporter = (error: unknown, context?: ErrorContext) => void;

const consoleReporter: ErrorReporter = (error, context) => {
  // Console is the always-available sink; a real provider replaces this.
  console.error('[error-tracking]', error, context ?? '');
};

let reporter: ErrorReporter = consoleReporter;

export function setErrorReporter(next: ErrorReporter): void {
  reporter = next;
}

/** Reports an exception; a failing reporter must never break the app. */
export function captureException(error: unknown, context?: ErrorContext): void {
  try {
    reporter(error, context);
  } catch {
    /* ignore */
  }
}

/**
 * Installs global handlers for errors outside React's boundary (uncaught
 * exceptions and unhandled promise rejections). Idempotent.
 */
let installed = false;

export function initGlobalErrorTracking(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', event => {
    captureException(event.error ?? new Error(event.message), { type: 'window.error' });
  });
  window.addEventListener('unhandledrejection', event => {
    captureException(event.reason instanceof Error ? event.reason : String(event.reason), {
      type: 'unhandledrejection',
    });
  });
}
