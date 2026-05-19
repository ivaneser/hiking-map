import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Run tests with complete deployment structure
  testDir: './dist',
  
  use: {
    viewport: { width: 1280, height: 720 },
  },
  
  timeout: 30 * 1000,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  
  projects: [
    {
      name: 'chromium',
      use: { 
        ...{ deviceScaleFactor: 1 },
        screenshot: 'only-on-failure',
      },
    },
  ],
  
  // Global setup - prepare deployment structure for testing
  globalSetup: './playwright-setup.js'
});
