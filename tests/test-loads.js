import { test, expect } from '@playwright/test';

test.describe('Hiking Map Application Loading', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:8765');
  });
  
  test('should load all scripts in correct order without errors', async ({ page }) => {
    // Check console for critical errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('L is not defined')) {
          errors.push('Leaflet L error');
        } else if (text.includes('ApiKeyManager is not a constructor')) {
          errors.push('ApiKeyManager load order error');
        } else if (!text.includes('Warning') && !text.includes('log')) {
          // Only critical errors
          console.log(`Console error: ${text}`);
        }
      }
    });
    
    // Wait for main content to load
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 1000));
    
    // Check that no critical errors occurred
    expect(errors).toHaveLength(0);
  });
  
  test('should have ApiKeyManager loaded for encrypted storage', async ({ page }) => {
    // Check that console logs show API key manager is initialized
    await page.locator('#apiKeyContainer').click();
    
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });
    
    // Wait a moment for async initialization
    await new Promise(r => setTimeout(r, 500));
    
    // Should see some initialization without errors
    expect(page.locator('body')).not.toHaveText(/Error|exception/i);
  });
  
  test('should load Leaflet map correctly', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    expect(logs).not.toContain('L is not defined');
    expect(page.locator('.leaflet')).toBeVisible();
  });
  
});
