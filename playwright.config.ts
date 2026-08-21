import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite — exercises the REAL full stack:
 *   browser → React → API client → Express → PostgreSQL
 *
 * Two web servers are started:
 *   1. The backend (`npm run e2e -w server`) resets a dedicated toybox_e2e
 *      database (drop → migrate → seed) on an embedded PostgreSQL, then
 *      serves the API on :4000.
 *   2. The production frontend build served by `vite preview` on :4173.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Resets + seeds the e2e database, then runs the API against it.
      command: 'npm run e2e -w server',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // Real production bundle served by vite preview (same artifact CI ships).
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
