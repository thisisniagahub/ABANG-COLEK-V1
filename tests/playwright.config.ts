import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Timeout 60s: spec pertama memuatkan ~100 modul Vite daripada cache sejuk pada
  // dev server, yang melebihi 30s walaupun aplikasi itu sendiri sihat.
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 60_000,
  outputDir: '../var/log/playwright',
  reporter: [['list'], ['html', { outputFolder: '../var/log/playwright-report', open: 'never' }]],
  use: { baseURL: process.env.PLATFORM_TEST_URL ?? 'http://127.0.0.1:3000', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
});
