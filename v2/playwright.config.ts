import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Smoke tests run against the production build, not the dev server: dev-only
 * transforms and HMR hide errors that ship. `npm run build` therefore runs
 * first, and the budget gate with it.
 */
const PORT = 4174;

/**
 * The remote dev environment ships Chromium at PLAYWRIGHT_BROWSERS_PATH and
 * forbids `playwright install`. Its revision will not always match the pinned
 * @playwright/test, so point at the binary directly when it is there. CI has no
 * such directory and installs the matching revision itself.
 */
function preinstalledChromium(): string | undefined {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  const dir = readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .pop();
  if (!dir) return undefined;
  const bin = join(root, dir, 'chrome-linux', 'chrome');
  return existsSync(bin) ? bin : undefined;
}

const executablePath = preinstalledChromium();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serial in CI so the single runner is not oversubscribed. Omitted rather than
  // set to undefined off CI, because exactOptionalPropertyTypes rejects that.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? ([['github'], ['list']] as const) : ([['list']] as const),

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Headless containers have no GPU; PixiJS needs a working WebGL context
      // from M3.1 on. SwiftShader provides one.
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
