import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const srcRoot = process.cwd();
const distRoot = path.join(srcRoot, 'dist');

setup('prepare deployment structure', async ({}, testRun) => {
  console.log('🔄 Setting up deployment structure for tests...');
  
  // Create dist directory if needed
  if (!fs.existsSync(distRoot)) {
    fs.mkdirSync(distRoot);
  }
  
  // Copy all files from root to dist (deployment structure)
  const files = [
    'index.html',
    'style.css',
    'api-keys.js',
    'config.js',
    'script.js',
    'setup-api-keys.js'
  ];
  
  for (const file of files) {
    if (fs.existsSync(path.join(srcRoot, file))) {
      fs.copyFileSync(
        path.join(srcRoot, file),
        path.join(distRoot, file)
      );
      console.log(`  ✓ Copied ${file}`);
    }
  }
  
  testRun.passed('Deployment structure prepared');
});
