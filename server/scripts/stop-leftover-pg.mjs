/**
 * Kills any leftover embedded PostgreSQL instance started by a previous
 * (aborted/force-killed) ToyBox run. Playwright force-terminates the API
 * web server, which can orphan the detached postgres daemon; without this
 * step the next run would hit "pre-existing shared memory block is still
 * in use" because the data directory is still locked.
 *
 * Safe: only touches postgres processes whose command line references a
 * ToyBox data directory (.pgdata*), never the system PostgreSQL service.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function stopOnWindows() {
  // Match the embedded binary path: backend worker processes (forkchild/
  // io_worker) do not carry the data-dir argument, but every embedded
  // postgres process does carry the binary path. The system PostgreSQL
  // service never uses this path, so it is never touched.
  const script = `
$targets = Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" |
  Where-Object { $_.CommandLine -like '*embedded-postgres*' }
foreach ($p in $targets) {
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  Write-Output ("stopped leftover embedded PostgreSQL pid " + $p.ProcessId)
}`;
  const dir = mkdtempSync(path.join(os.tmpdir(), 'toybox-stop-pg-'));
  const file = path.join(dir, 'stop.ps1');
  writeFileSync(file, script);
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file], {
      encoding: 'utf8',
    });
    if (out.trim()) console.log(`[e2e] ${out.trim().split('\n').join('\n[e2e] ')}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('0')) console.log(`[e2e] leftover cleanup: ${msg.split('\n')[0]}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function stopOnPosix() {
  try {
    const out = execFileSync('pkill', ['-f', 'pgdata'], { encoding: 'utf8' });
    if (out.trim()) console.log(`[e2e] ${out.trim()}`);
  } catch {
    // No matching process — nothing to clean.
  }
}

if (process.platform === 'win32') {
  stopOnWindows();
} else {
  stopOnPosix();
}
