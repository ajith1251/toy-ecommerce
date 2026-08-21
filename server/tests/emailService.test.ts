import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildResetUrl, createEmailService, type PasswordResetEmail } from '../src/services/emailService.js';

// Hoisted before the module graph loads, so emailService.ts picks it up.
const mocks = vi.hoisted(() => ({ createTransport: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));

const message: PasswordResetEmail = {
  to: 'jane@example.com',
  firstName: 'Jane',
  resetUrl: 'http://localhost:5173/reset-password?token=abc123',
};

describe('buildResetUrl', () => {
  it('appends the one-time token as a query parameter', () => {
    const url = buildResetUrl('http://localhost:5173', 'tok-123');
    expect(url).toBe('http://localhost:5173/reset-password?token=tok-123');
  });

  it('handles base URLs with an existing path or trailing slash', () => {
    expect(buildResetUrl('https://toybox.example.com/', 'x')).toBe(
      'https://toybox.example.com/reset-password?token=x'
    );
  });
});

describe('console transport', () => {
  it('logs the reset link to the server console', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const email = createEmailService({ transport: 'console' });
    await email.sendPasswordResetEmail(message);
    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0][0] as string;
    expect(line).toContain('To: jane@example.com');
    expect(line).toContain('http://localhost:5173/reset-password?token=abc123');
    log.mockRestore();
  });
});

describe('file transport', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'toybox-outbox-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('appends each email as a JSON line to the outbox', async () => {
    const outbox = path.join(dir, 'nested', 'outbox.jsonl');
    const email = createEmailService({ transport: 'file', outboxPath: outbox });
    await email.sendPasswordResetEmail(message);
    await email.sendPasswordResetEmail({ ...message, to: 'bob@example.com' });

    expect(existsSync(outbox)).toBe(true);
    const lines = readFileSync(outbox, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.to).toBe('jane@example.com');
    expect(first.resetUrl).toBe(message.resetUrl);
    expect(first.text).toContain('expires in 30 minutes');
    expect(first.subject).toContain('ToyBox');
  });
});

describe('smtp transport', () => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'm1' });

  beforeEach(() => {
    sendMail.mockClear();
    mocks.createTransport.mockReset();
    mocks.createTransport.mockReturnValue({ sendMail } as never);
  });

  it('sends a reset email through nodemailer with the configured sender', async () => {
    const email = createEmailService({
      transport: 'smtp',
      from: 'ToyBox <no-reply@toybox.example.com>',
      smtp: { host: 'smtp.example.com', port: 587, user: 'u', pass: 'p', secure: false },
    });

    await email.sendPasswordResetEmail(message);

    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 587 })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ToyBox <no-reply@toybox.example.com>',
        to: 'jane@example.com',
        subject: expect.stringContaining('ToyBox'),
        text: expect.stringContaining(message.resetUrl),
        html: expect.stringContaining(`<a href="${message.resetUrl}">`),
      })
    );
  });

  it('reuses a single transporter across sends', async () => {
    const email = createEmailService({
      transport: 'smtp',
      smtp: { host: 'smtp.example.com', port: 587, user: 'u', pass: 'p', secure: false },
    });
    await email.sendPasswordResetEmail(message);
    await email.sendPasswordResetEmail(message);
    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('throws when SMTP is selected but not configured', async () => {
    const email = createEmailService({ transport: 'smtp', smtp: null });
    await expect(email.sendPasswordResetEmail(message)).rejects.toThrow(/SMTP_HOST/);
  });
});
