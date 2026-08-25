/**
 * M5.3: the deploy shape, tested.
 *
 * GitHub Pages serves a project site from a subdirectory, not a domain root.
 * The whole build is arranged to survive that — vite's `base: './'`, the
 * service worker's scope-relative precache — but if it does not, the failure is
 * a site that works on localhost and 404s in production, which is exactly the
 * class of bug only users ever find.
 *
 * This config stages the build under a subdirectory, serves it with a plain
 * static server, and runs the deploy suite against it.
 *
 * Run with: npm run test:deploy
 */
import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 4188;
const SUBPATH = 'StarShipSimulator';

/** Reuse the container's Chromium rather than downloading another. */
function localChromium(): string | undefined {
  const root = process.env['PLAYWRIGHT_BROWSERS_PATH'];
  if (!root || !existsSync(root)) return undefined;
  const dir = readdirSync(root).find((name) => name.startsWith('chromium-'));
  if (!dir) return undefined;
  const binary = join(root, dir, 'chrome-linux', 'chrome');
  return existsSync(binary) ? binary : undefined;
}

const executablePath = localChromium();

export default defineConfig({
  testDir: './tests/deploy',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}/${SUBPATH}/`,
    trace: 'off',
    ...devices['Desktop Chrome'],
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
    },
  },

  webServer: {
    // A plain static file server, deliberately: `vite preview` rewrites paths
    // and would hide exactly the mistakes this config exists to catch.
    command: `npm run build && node scripts/stage-subpath.mjs dist .subpath ${SUBPATH} && python3 -m http.server ${PORT} --directory .subpath --bind 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/${SUBPATH}/`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
