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
import { preinstalledChromium } from './tests/e2e/chromium';

const PORT = Number(process.env.E2E_SUBPATH_PORT ?? 4188);
const SUBPATH = 'StarShipSimulator';

const executablePath = preinstalledChromium();

/**
 * E2E_BASE_URL points the same checks at a real deployment, such as the live
 * Pages site after a cut-over; then no local server is started.
 */
const LIVE = process.env.E2E_BASE_URL?.replace(/\/?$/, '/');

export default defineConfig({
  testDir: './tests/deploy',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: LIVE ?? `http://127.0.0.1:${PORT}/${SUBPATH}/`,
    trace: 'off',
    ...devices['Desktop Chrome'],
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
    },
  },

  ...(LIVE
    ? {}
    : {
        webServer: {
          // A plain static file server, deliberately: `vite preview` rewrites paths
          // and would hide exactly the mistakes this config exists to catch.
          command: `${process.env.E2E_SKIP_BUILD ? '' : 'npm run build && '}node scripts/stage-subpath.mjs dist .subpath ${SUBPATH} && node scripts/serve-static.mjs .subpath ${PORT}`,
          url: `http://127.0.0.1:${PORT}/${SUBPATH}/`,
          reuseExistingServer: false,
          timeout: 300_000,
        },
      }),
});
