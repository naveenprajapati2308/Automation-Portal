import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['./tests/reporter/testrix-reporter.ts'],
  ],
});
