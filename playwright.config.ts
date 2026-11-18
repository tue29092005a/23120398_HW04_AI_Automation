import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * HW04 – AI Automation Testing (EShop SUT)
 * Student: 23120398
 *
 * REPORT_DIR (optional) lets scripts/run-all.mjs write one HTML report per
 * feature x browser, e.g. reports/fr03-chromium.
 */
const STUDENT_ID = '23120398';
const RUN_AT = new Date().toISOString();
const REPORT_DIR = process.env.REPORT_DIR ?? 'playwright-report';
const RUN_NAME = path.basename(REPORT_DIR);

export default defineConfig({
  testDir: './tests',
  // The SUT keeps everything in one SQLite file, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: `test-results/${RUN_NAME}`,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: REPORT_DIR,
        open: 'never',
        title: `Run by: ${STUDENT_ID} – ${RUN_AT}`,
      },
    ],
    // Listed after html: the html reporter wipes its folder when it writes.
    ['json', { outputFile: `${REPORT_DIR}/results.json` }],
  ],
  metadata: {
    'Run by': STUDENT_ID,
    Timestamp: RUN_AT,
    Report: RUN_NAME,
  },
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'en-US', // toLocaleString() -> "30,000,000" on every browser
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
