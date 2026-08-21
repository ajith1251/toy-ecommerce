import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { EmailConfig } from '../config.js';

export interface PasswordResetEmail {
  to: string;
  firstName: string;
  resetUrl: string;
}

export interface EmailService {
  readonly transport: EmailConfig['transport'];
  sendPasswordResetEmail(email: PasswordResetEmail): Promise<void>;
}

const RESET_SUBJECT = 'Reset your ToyBox password';

/** Builds the one-time reset URL the email body links to. */
export function buildResetUrl(appBaseUrl: string, token: string): string {
  const url = new URL(appBaseUrl);
  url.pathname = '/reset-password';
  url.searchParams.set('token', token);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[c] ?? c;
  });
}

function textBody(email: PasswordResetEmail): string {
  return [
    `Hi ${email.firstName},`,
    '',
    'We received a request to reset your ToyBox password. Use the link below',
    'to choose a new one — it expires in 30 minutes:',
    '',
    email.resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');
}

function htmlBody(email: PasswordResetEmail): string {
  return [
    `<p>Hi ${escapeHtml(email.firstName)},</p>`,
    '<p>We received a request to reset your ToyBox password. Use the button below',
    'to choose a new one — it expires in 30 minutes:</p>',
    `<p><a href="${email.resetUrl}">Reset your password</a></p>`,
    '<p>If the button does not work, copy this link:</p>',
    `<p><code>${email.resetUrl}</code></p>`,
    "<p>If you didn't request this, you can safely ignore this email.</p>",
  ].join('\n');
}

/**
 * Email delivery abstraction. Three transports:
 *
 * - `console` — logs the reset link to the server console (zero-setup dev;
 *   the link contains the one-time token, visible only in server logs).
 * - `file`   — appends each email as a JSON line to `outboxPath` so tests
 *   and local dev can inspect deliveries (mailpit-style, no SMTP needed).
 * - `smtp`   — real delivery via nodemailer (production).
 *
 * Raw reset tokens are never persisted anywhere except the hashed form in
 * `password_resets`; only the link travels through this service.
 */
export function createEmailService(emailConfig: Partial<EmailConfig> = {}): EmailService {
  const config: EmailConfig = {
    transport: emailConfig.transport ?? 'console',
    from: emailConfig.from ?? 'ToyBox <no-reply@toybox.local>',
    appBaseUrl: emailConfig.appBaseUrl ?? 'http://localhost:5173',
    outboxPath: emailConfig.outboxPath ?? '.outbox.jsonl',
    smtp: emailConfig.smtp ?? null,
  };

  async function sendConsole(email: PasswordResetEmail): Promise<void> {
    console.log(`[email:console] To: ${email.to} | ${RESET_SUBJECT}\n${email.resetUrl}`);
  }

  async function sendFile(email: PasswordResetEmail): Promise<void> {
    mkdirSync(path.dirname(config.outboxPath), { recursive: true });
    const record = {
      to: email.to,
      subject: RESET_SUBJECT,
      resetUrl: email.resetUrl,
      text: textBody(email),
      timestamp: new Date().toISOString(),
    };
    appendFileSync(config.outboxPath, `${JSON.stringify(record)}\n`);
  }

  let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  async function sendSmtp(email: PasswordResetEmail): Promise<void> {
    if (!config.smtp) {
      throw new Error('Email transport is SMTP but SMTP_HOST is not configured');
    }
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      });
    }
    await transporter.sendMail({
      from: config.from,
      to: email.to,
      subject: RESET_SUBJECT,
      text: textBody(email),
      html: htmlBody(email),
    });
  }

  const send =
    config.transport === 'smtp' ? sendSmtp : config.transport === 'file' ? sendFile : sendConsole;

  return { transport: config.transport, sendPasswordResetEmail: send };
}
