import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-playwright',
  timeout: 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'file://' + __dirname + '/index.html',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {},
    },
  ],

  webServer: {
    command: '',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
