import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  
  use: {
    viewport: { width: 1280, height: 720 },
  },
  
  timeout: 30 * 1000,
  
  reporter: [
    ['list'],
  ],
  
  projects: [
    {
      name: 'chromium',
      use: { 
        deviceScaleFactor: 1,
      },
    },
  ],
});
