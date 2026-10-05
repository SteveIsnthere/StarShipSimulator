/** Exact Phase8 acceptance viewports, serial on any supported Chromium host. */
import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import { chromiumLaunchOptions } from './tests/e2e/chromium';

// The portable acceptance default is explicit software WebGL. An intentional
// override is recorded alongside the observed renderer rather than called native.
process.env['E2E_GPU_POLICY'] ??= 'swiftshader';

export default defineConfig({
  ...base,
  testMatch: 'visual-budget.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual-budget', open: 'never' }]],
  outputDir: 'test-results/visual-budget',
  use: { ...base.use, launchOptions: chromiumLaunchOptions(), trace: 'off', video: 'off' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 } },
    { name: 'phone-portrait', use: { browserName: 'chromium', viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'phone-landscape', use: { browserName: 'chromium', viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
