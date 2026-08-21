import type { ServerConfig } from '../config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

type Writer = (line: string) => void;

let logFormat: 'json' | 'pretty' = 'pretty';
let write: Writer = line => console.log(line);
let writeError: Writer = line => console.error(line);

/**
 * Configures the logger once at boot. `json` emits one JSON object per line
 * (production — ingestible by any log platform); `pretty` keeps the
 * human-readable dev output.
 */
export function initLogger(config: Pick<ServerConfig, 'logFormat' | 'nodeEnv'>): void {
  logFormat = config.logFormat;
}

/** Test seam: capture log lines instead of writing to stdout. */
export function setLogWriters(out: Writer, err: Writer): void {
  write = out;
  writeError = err;
}

function emit(level: LogLevel, msg: string, fields: LogFields, isError: boolean): void {
  const time = new Date().toISOString();
  if (logFormat === 'json') {
    // JSON lines: { time, level, msg, ...fields }. Fields never contain
    // request/response bodies or secrets — callers only pass metadata.
    const line = JSON.stringify({ time, level, msg, ...fields });
    (isError ? writeError : write)(line);
  } else {
    const extras = Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => ` ${k}=${String(v)}`)
      .join('');
    const line = `${time} ${level.toUpperCase()} ${msg}${extras}`;
    (isError ? writeError : write)(line);
  }
}

export const log = {
  debug: (msg: string, fields: LogFields = {}) => emit('debug', msg, fields, false),
  info: (msg: string, fields: LogFields = {}) => emit('info', msg, fields, false),
  warn: (msg: string, fields: LogFields = {}) => emit('warn', msg, fields, false),
  error: (msg: string, fields: LogFields = {}) => emit('error', msg, fields, true),
};
