import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env when running locally. In CI, environment variables are injected
// by the pipeline and dotenv is a no-op (existing env vars are not overwritten).
dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Where Playwright writes screenshots, traces, and videos on failure.
  // Documented here so agents know where to look when a test breaks.
  outputDir: 'test-results',

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4101',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',

    // How long a single action (click, fill, goto) may take before timing out.
    actionTimeout: 10_000,

    // How long an assertion (expect) may retry before failing.
    navigationTimeout: 15_000,
  },

  // How long a single test may run end-to-end.
  timeout: 30_000,

  // How long expect() retries before giving up.
  expect: {
    timeout: 5_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: './global-setup.ts',
});
