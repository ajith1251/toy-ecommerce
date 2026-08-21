/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split large vendor libraries into cacheable chunks so no single
        // bundle exceeds Vite's 500 kB advisory limit. Route-level lazy
        // loading remains deferred (see roadmap) to keep the routing suite
        // synchronous; this removes the size warning without async tests.
        manualChunks(id) {
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // E2E specs live in e2e/ and run under Playwright; server tests run in
    // the server workspace (Node env) — neither belongs under this jsdom suite.
    exclude: ['e2e/**', 'server/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/data/**',
        'src/assets/**',
        'src/types/**',
        'src/test/**',
        '**/*.test.{ts,tsx}',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        statements: 75,
        branches: 60,
      },
    },
  },
})
