import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Server package root (server/), used to resolve data dirs regardless of cwd. */
export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  // Treat unset/empty/zero (e.g. a placeholder PORT=0 in the environment)
  // as "use the default" — a server cannot meaningfully bind port 0.
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  /** Explicit DATABASE_URL wins; otherwise an embedded PostgreSQL is managed locally. */
  databaseUrl: string | null;
  embedded: {
    enabled: boolean;
    port: number;
    dbName: string;
    user: string;
    password: string;
    dataDir: string;
  };
  /** PostgreSQL connection-pool tuning (one pool per process). */
  db: {
    poolMax: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
  };
  /** `json` = machine-parseable JSON lines (production); `pretty` = dev text. */
  logFormat: 'json' | 'pretty';
  corsOrigins: string[];
  rateLimit: { windowMs: number; max: number };
  auth: {
    sessionTtlMs: number;
    cookieName: string;
    cookieSecure: boolean;
    passwordResetTtlMs: number;
    authRateLimit: { windowMs: number; max: number };
  };
  adminRateLimit: { windowMs: number; max: number };
  email: EmailConfig;
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    /** Client-side timeout for Razorpay API calls (ms). */
    timeoutMs: number;
  };
}

export type EmailTransport = 'console' | 'file' | 'smtp';

export interface EmailConfig {
  /** How reset links are delivered: console log (dev), file outbox (dev/E2E
   *  inspection), or real SMTP (production). */
  transport: EmailTransport;
  from: string;
  /** Public origin used to build reset links, e.g. https://toybox.example.com. */
  appBaseUrl: string;
  /** JSONL outbox file for the `file` transport (resolved from server/). */
  outboxPath: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  } | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const nodeEnv = (env.NODE_ENV as ServerConfig['nodeEnv']) ?? 'development';
  const isProduction = nodeEnv === 'production';

  return {
    nodeEnv,
    isProduction,
    port: int(env.PORT, 4000),
    databaseUrl: env.DATABASE_URL?.trim() || null,
    embedded: {
      enabled: bool(env.EMBEDDED_PG, true),
      port: int(env.EMBEDDED_PG_PORT, 55432),
      dbName: env.DB_NAME?.trim() || 'toybox',
      user: env.EMBEDDED_PG_USER?.trim() || 'toybox',
      password: env.EMBEDDED_PG_PASSWORD?.trim() || 'toybox',
      dataDir: path.resolve(SERVER_ROOT, env.EMBEDDED_PG_DATA_DIR?.trim() || '.pgdata'),
    },
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    db: {
      poolMax: int(env.DB_POOL_MAX, 10),
      idleTimeoutMs: int(env.DB_IDLE_TIMEOUT_MS, 30_000),
      connectionTimeoutMs: int(env.DB_CONNECT_TIMEOUT_MS, 10_000),
    },
    logFormat: env.LOG_FORMAT?.trim().toLowerCase() === 'json' || isProduction ? 'json' : 'pretty',
    rateLimit: {
      windowMs: int(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      // General-API safety net (~1 req/s sustained per IP); strict budgets
      // live on auth/admin. Tune down via RATE_LIMIT_MAX per environment.
      max: int(env.RATE_LIMIT_MAX, 1000),
    },
    auth: {
      // 7 days; refresh slides the expiry forward.
      sessionTtlMs: int(env.SESSION_TTL_MS, 7 * 24 * 60 * 60 * 1000),
      cookieName: env.SESSION_COOKIE_NAME?.trim() || 'toybox_session',
      // Secure cookies only in production (HTTPS); plain HTTP in dev/test.
      cookieSecure: isProduction ? bool(env.SESSION_COOKIE_SECURE, true) : bool(env.SESSION_COOKIE_SECURE, false),
      passwordResetTtlMs: int(env.PASSWORD_RESET_TTL_MS, 30 * 60 * 1000),
      authRateLimit: {
        windowMs: int(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: int(env.AUTH_RATE_LIMIT_MAX, 20),
      },
    },
    // Admin operations are authenticated but still capped (defense in depth
    // against a compromised session hammering mutations).
    adminRateLimit: {
      windowMs: int(env.ADMIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: int(env.ADMIN_RATE_LIMIT_MAX, 100),
    },
    email: {
      // Explicit EMAIL_TRANSPORT wins; otherwise SMTP when configured, else
      // the console fallback (dev) so the flow works with zero setup.
      transport: (env.EMAIL_TRANSPORT as EmailTransport | undefined) ??
        (env.SMTP_HOST ? 'smtp' : 'console'),
      from: env.MAIL_FROM?.trim() || 'ToyBox <no-reply@toybox.local>',
      appBaseUrl: env.APP_BASE_URL?.trim() || 'http://localhost:5173',
      outboxPath: path.resolve(SERVER_ROOT, env.EMAIL_OUTBOX_PATH?.trim() || '.outbox.jsonl'),
      smtp: env.SMTP_HOST?.trim()
        ? {
            host: env.SMTP_HOST.trim(),
            port: int(env.SMTP_PORT, 587),
            user: env.SMTP_USER?.trim() || '',
            pass: env.SMTP_PASS ?? '',
            secure: bool(env.SMTP_SECURE, false),
          }
        : null,
    },
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID?.trim() || '',
      keySecret: env.RAZORPAY_KEY_SECRET?.trim() || '',
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET?.trim() || '',
      timeoutMs: int(env.RAZORPAY_TIMEOUT_MS, 15_000),
    },
  };
}

/**
 * Production startup safety checks. Returns a list of human-readable
 * problems; an empty list means the configuration is safe to boot.
 *
 * Fail-safe philosophy: production must never silently fall back to
 * development-grade defaults (embedded PostgreSQL, permissive CORS,
 * non-secure cookies, missing payment credentials).
 */
export function validateProductionConfig(config: ServerConfig): string[] {
  const problems: string[] = [];

  if (!config.databaseUrl) {
    problems.push(
      'DATABASE_URL is required in production — the embedded development PostgreSQL must not be used'
    );
  }
  if (config.embedded.enabled && !config.databaseUrl) {
    problems.push('EMBEDDED_PG must be disabled in production (set EMBEDDED_PG=0 with DATABASE_URL)');
  }
  if (config.corsOrigins.length === 0) {
    problems.push('CORS_ORIGINS must list the explicit production origins (comma-separated)');
  } else if (config.corsOrigins.some(o => o.includes('localhost') || o.includes('127.0.0.1'))) {
    problems.push(`CORS_ORIGINS contains localhost origins in production: ${config.corsOrigins.join(', ')}`);
  }
  if (!config.auth.cookieSecure) {
    problems.push('SESSION_COOKIE_SECURE must be enabled in production (HTTPS-only cookies)');
  }
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    problems.push('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production');
  }
  if (!config.razorpay.webhookSecret) {
    problems.push('RAZORPAY_WEBHOOK_SECRET is required in production — webhook signatures cannot be verified without it');
  }
  if (config.email.transport !== 'smtp') {
    problems.push('EMAIL_TRANSPORT=smtp with SMTP_HOST is required in production — password-reset emails must be deliverable');
  }

  return problems;
}

/** Thrown when production configuration validation fails at boot. */
export class ConfigValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid production configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'ConfigValidationError';
    this.problems = problems;
  }
}

export const config = loadConfig();
